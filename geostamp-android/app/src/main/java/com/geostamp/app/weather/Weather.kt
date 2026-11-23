package com.geostamp.app.weather

import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

data class Weather(val tempC: Double, val code: Int, val windMs: Double, val humidity: Int?, val fetchedAt: Long) {
    /** «−3 °C, снег, ветер 4 м/с» */
    fun text(): String = WeatherText.format(tempC, code, windMs)
}

object WeatherText {
    /** Коды WMO (используются Open-Meteo) → короткое описание по-русски. */
    fun describe(code: Int): String = when (code) {
        0 -> "ясно"
        1 -> "малооблачно"
        2 -> "переменная облачность"
        3 -> "пасмурно"
        45, 48 -> "туман"
        51, 53, 55 -> "морось"
        56, 57 -> "ледяная морось"
        61, 63 -> "дождь"
        65 -> "сильный дождь"
        66, 67 -> "ледяной дождь"
        71, 73 -> "снег"
        75 -> "сильный снег"
        77 -> "снежные зёрна"
        80, 81 -> "ливень"
        82 -> "сильный ливень"
        85, 86 -> "снегопад"
        95 -> "гроза"
        96, 99 -> "гроза с градом"
        else -> "—"
    }

    fun format(tempC: Double, code: Int, windMs: Double): String {
        val t = tempC.roundToInt()
        val sign = if (t < 0) "−" else if (t > 0) "+" else ""
        return "$sign${kotlin.math.abs(t)} °C, ${describe(code)}, ветер ${windMs.roundToInt()} м/с"
    }
}

/**
 * Текущая погода с Open-Meteo: без ключа API, по координатам. Кеш на 20 минут / 3 км —
 * сеть дёргается редко, без интернета поле просто не выводится.
 * Внимание: бесплатный тариф Open-Meteo — для некоммерческого использования.
 */
class WeatherProvider(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS).readTimeout(8, TimeUnit.SECONDS).build(),
) {
    private var cached: Triple<Double, Double, Weather>? = null

    fun cachedFor(lat: Double, lon: Double, now: Long = System.currentTimeMillis()): Weather? {
        val (clat, clon, w) = cached ?: return null
        val fresh = now - w.fetchedAt < 20 * 60_000L
        val near = distanceKm(lat, lon, clat, clon) < 3.0
        return if (fresh && near) w else null
    }

    /** Блокирующий вызов — только из Dispatchers.IO. */
    fun fetch(lat: Double, lon: Double): Weather? {
        cachedFor(lat, lon)?.let { return it }
        val url = String.format(Locale.US,
            "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f" +
                "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&wind_speed_unit=ms", lat, lon)
        return runCatching {
            http.newCall(Request.Builder().url(url).build()).execute().use { r ->
                if (!r.isSuccessful) return null
                val cur = JSONObject(r.body!!.string()).getJSONObject("current")
                Weather(
                    tempC = cur.getDouble("temperature_2m"),
                    code = cur.optInt("weather_code", -1),
                    windMs = cur.optDouble("wind_speed_10m", 0.0),
                    humidity = if (cur.has("relative_humidity_2m")) cur.optInt("relative_humidity_2m") else null,
                    fetchedAt = System.currentTimeMillis(),
                ).also { cached = Triple(lat, lon, it) }
            }
        }.getOrNull()
    }

    private fun distanceKm(a1: Double, o1: Double, a2: Double, o2: Double): Double {
        val r = 6371.0
        val dLat = Math.toRadians(a2 - a1); val dLon = Math.toRadians(o2 - o1)
        val h = Math.sin(dLat / 2).let { it * it } +
            Math.cos(Math.toRadians(a1)) * Math.cos(Math.toRadians(a2)) * Math.sin(dLon / 2).let { it * it }
        return 2 * r * Math.asin(Math.sqrt(h))
    }

}
