package com.geostamp.app.stamp

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs

data class StampData(
    val timeMillis: Long,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val altitude: Double? = null,
    val accuracy: Float? = null,
    val address: String? = null,
    val locality: String? = null,
    val project: String? = null,
    val note: String? = null,
    val weather: String? = null,
    /** Координаты пришли от приложения-подменщика (Android isMock). Не отключается пользователем. */
    val mockLocation: Boolean = false,
) {
    val hasFix: Boolean get() = latitude != null && longitude != null

    companion object {
        val SAMPLE = StampData(
            timeMillis = 1_763_556_900_000L,
            latitude = 43.238949, longitude = 76.889709, altitude = 812.0, accuracy = 4f,
            address = "проспект Абая, 44, Алматы", locality = "Алматы",
            project = "ЖК «Северный», корпус 2", note = "Монтаж окон, 3 этаж",
            weather = "−3 °C, снег, ветер 4 м/с",
        )
    }
}

enum class CoordFormat { DECIMAL, DMS }

data class StampOptions(
    val showAddress: Boolean = true,
    val showCoords: Boolean = true,
    val showAltitude: Boolean = false,
    val showProject: Boolean = false,
    val showNote: Boolean = false,
    val coordFormat: CoordFormat = CoordFormat.DECIMAL,
    val showWeather: Boolean = true,
)

enum class StampTemplate(val title: String, val description: String) {
    CLASSIC("Классика", "Время, дата, адрес на тёмной плашке"),
    REPORT("Фотоотчёт", "Таблица для работы: объект, адрес, координаты"),
    BADGE("Бейдж", "Яркий блок времени и место"),
    MINIMAL("Минимал", "Только текст с тенью в углу"),
    TECH("Геодезия", "Моноширинные координаты, высота, точность"),
    TRAVEL("Путешествие", "Крупная дата и город по центру"),
}

/** Форматирование, общее для штампа, подписи WhatsApp и описания в Drive. */
object StampFormat {
    val RU: Locale = Locale.forLanguageTag("ru")

    private fun fmt(pattern: String, millis: Long, tz: TimeZone = TimeZone.getDefault()) =
        SimpleDateFormat(pattern, RU).apply { timeZone = tz }.format(Date(millis))

    fun time(m: Long) = fmt("HH:mm", m)
    fun timeSec(m: Long) = fmt("HH:mm:ss", m)
    fun date(m: Long) = fmt("dd.MM.yyyy", m)
    fun weekday(m: Long) = fmt("EEEE", m)
    fun dayMonth(m: Long) = fmt("d MMMM", m)
    fun year(m: Long) = fmt("yyyy", m)
    fun iso(m: Long) = fmt("yyyy-MM-dd", m)
    fun fileStamp(m: Long) = fmt("yyyyMMdd_HHmmss", m)

    fun utcOffset(m: Long): String {
        val off = TimeZone.getDefault().getOffset(m) / 60_000
        val sign = if (off >= 0) "+" else "−"
        val h = abs(off) / 60
        val min = abs(off) % 60
        return if (min == 0) "UTC$sign$h" else "UTC$sign$h:%02d".format(min)
    }

    fun coords(lat: Double, lon: Double, f: CoordFormat): String = when (f) {
        CoordFormat.DECIMAL -> String.format(Locale.US, "%.6f° %s, %.6f° %s",
            abs(lat), if (lat >= 0) "N" else "S", abs(lon), if (lon >= 0) "E" else "W")
        CoordFormat.DMS -> "${dms(lat, "N", "S")}  ${dms(lon, "E", "W")}"
    }

    fun dms(value: Double, pos: String, neg: String): String {
        val a = abs(value)
        var d = a.toInt()
        val mFull = (a - d) * 60
        var m = mFull.toInt()
        var s = (mFull - m) * 60
        // Округление до 0.1" может дать 60.0 — переносим разряд.
        if (Math.round(s * 10) >= 600) { s = 0.0; m += 1 }
        if (m >= 60) { m = 0; d += 1 }
        return String.format(Locale.US, "%d°%02d'%04.1f\" %s", d, m, s, if (value >= 0) pos else neg)
    }

    fun altitude(alt: Double) = "${Math.round(alt)} м н.у.м."
    fun accuracy(acc: Float) = "±${Math.round(acc)} м"

    /** Текст-подпись к снимку для мессенджеров/облака. */
    fun caption(d: StampData, f: CoordFormat = CoordFormat.DECIMAL): String = buildString {
        append("🕒 ").append(date(d.timeMillis)).append(' ').append(timeSec(d.timeMillis))
        if (!d.project.isNullOrBlank()) append("\n🏗 ").append(d.project)
        if (!d.address.isNullOrBlank()) append("\n📍 ").append(d.address)
        if (d.latitude != null && d.longitude != null) {
            append("\n🌐 ").append(coords(d.latitude, d.longitude, f))
            append("\nhttps://maps.google.com/?q=")
                .append(String.format(Locale.US, "%.6f,%.6f", d.latitude, d.longitude))
        }
        if (!d.weather.isNullOrBlank()) append("\n🌤 ").append(d.weather)
        if (!d.note.isNullOrBlank()) append("\n📝 ").append(d.note)
        if (d.mockLocation) append("\n⚠ Координаты подменены программой (mock location)")
    }
}
