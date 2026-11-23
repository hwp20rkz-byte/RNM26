package com.geostamp.app

import com.geostamp.app.security.PinHasher
import com.geostamp.app.stamp.CoordFormat
import com.geostamp.app.stamp.StampData
import com.geostamp.app.stamp.StampFormat
import com.geostamp.app.weather.WeatherText
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CoreLogicTest {

    @Test fun pinHashMatchesOnlyCorrectPin() {
        val salt = PinHasher.newSalt()
        val hash = PinHasher.hash("4821", salt, iterations = 1_000)
        assertTrue(PinHasher.matches("4821", salt, hash, iterations = 1_000))
        assertFalse(PinHasher.matches("4822", salt, hash, iterations = 1_000))
    }

    @Test fun samePinDifferentSaltGivesDifferentHash() {
        val a = PinHasher.hash("4821", PinHasher.newSalt(), 1_000)
        val b = PinHasher.hash("4821", PinHasher.newSalt(), 1_000)
        assertFalse(a.contentEquals(b))
    }

    @Test fun lockoutEscalates() {
        assertEquals(0, PinHasher.lockoutMillis(4))
        assertEquals(30_000, PinHasher.lockoutMillis(5))
        assertEquals(60_000, PinHasher.lockoutMillis(6))
        assertEquals(15 * 60_000L, PinHasher.lockoutMillis(50))
    }

    @Test fun dmsFormatting() {
        assertEquals("43°14'20.2\" N", StampFormat.dms(43.238949, "N", "S"))
        assertEquals("76°53'23.0\" E", StampFormat.dms(76.889709, "E", "W"))
        assertEquals("33°52'08.0\" S", StampFormat.dms(-33.868889, "N", "S"))
    }

    @Test fun dmsRoundingCarriesOver() {
        // 10.9999999° не должно превратиться в 10°59'60.0"
        assertEquals("11°00'00.0\" N", StampFormat.dms(10.9999999, "N", "S"))
    }

    @Test fun decimalCoordsUseDotAndHemisphere() {
        assertEquals("43.238949° N, 76.889709° E", StampFormat.coords(43.238949, 76.889709, CoordFormat.DECIMAL))
        assertEquals("12.500000° S, 45.000000° W", StampFormat.coords(-12.5, -45.0, CoordFormat.DECIMAL))
    }

    @Test fun captionContainsMapLink() {
        val text = StampFormat.caption(StampData.SAMPLE)
        assertTrue(text.contains("https://maps.google.com/?q=43.238949,76.889709"))
        assertTrue(text.contains("проспект Абая"))
    }

    @Test fun weatherTextFormatting() {
        assertEquals("−3 °C, снег, ветер 4 м/с", WeatherText.format(-3.2, 71, 4.4))
        assertEquals("+18 °C, ясно, ветер 2 м/с", WeatherText.format(17.6, 0, 1.6))
        assertEquals("0 °C, туман, ветер 0 м/с", WeatherText.format(-0.3, 45, 0.2))
    }

    @Test fun captionWarnsAboutMockLocation() {
        val text = StampFormat.caption(StampData.SAMPLE.copy(mockLocation = true))
        assertTrue(text.contains("подменены"))
        assertTrue(text.contains("−3 °C"))
        assertFalse(StampFormat.caption(StampData.SAMPLE).contains("подменены"))
    }
}
