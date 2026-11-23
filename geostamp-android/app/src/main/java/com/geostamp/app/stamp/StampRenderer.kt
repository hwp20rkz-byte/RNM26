package com.geostamp.app.stamp

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import androidx.core.graphics.ColorUtils
import kotlin.math.max
import kotlin.math.min

/**
 * Рисует штамп на любом Canvas: превью камеры (Compose nativeCanvas), фото (Bitmap),
 * кадры видео (Media3 CanvasOverlay). Один код — штамп на превью совпадает с результатом.
 * Масштаб считается от короткой стороны кадра, поэтому штамп одинаков в 4:3, 16:9 и ландшафте.
 */
object StampRenderer {

    private object C {
        val white = ColorUtils.HSLToColor(floatArrayOf(220f, 0.20f, 0.97f))
        val muted = ColorUtils.setAlphaComponent(white, 0xC8)
        val accent = ColorUtils.HSLToColor(floatArrayOf(24f, 1.00f, 0.55f))
        val ink = ColorUtils.HSLToColor(floatArrayOf(222f, 0.20f, 0.08f))
        val panel = ColorUtils.setAlphaComponent(ColorUtils.HSLToColor(floatArrayOf(222f, 0.25f, 0.06f)), 0x99)
        val panelSolid = ColorUtils.setAlphaComponent(ColorUtils.HSLToColor(floatArrayOf(222f, 0.18f, 0.09f)), 0xE6)
        val shadow = ColorUtils.setAlphaComponent(ink, 0xB0)
        val danger = ColorUtils.HSLToColor(floatArrayOf(0f, 0.78f, 0.50f))
    }

    private val SANS: Typeface = Typeface.SANS_SERIF
    private val SANS_BOLD: Typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
    private val SANS_ITALIC: Typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.ITALIC)
    private val MONO: Typeface = Typeface.MONOSPACE
    private val MONO_BOLD: Typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
    private val SERIF_BI: Typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD_ITALIC)

    fun draw(c: Canvas, w: Int, h: Int, d: StampData, t: StampTemplate, o: StampOptions) {
        if (w <= 0 || h <= 0) return
        val u = min(w, h) / 360f
        when (t) {
            StampTemplate.CLASSIC -> classic(c, w, h, u, d, o)
            StampTemplate.REPORT -> report(c, w, h, u, d, o)
            StampTemplate.BADGE -> badge(c, w, h, u, d, o)
            StampTemplate.MINIMAL -> minimal(c, w, h, u, d, o)
            StampTemplate.TECH -> tech(c, w, h, u, d, o)
            StampTemplate.TRAVEL -> travel(c, w, h, u, d, o)
        }
        if (d.mockLocation) mockBadge(c, w, u)
    }

    // ---------- helpers ----------

    private fun paint(size: Float, color: Int, tf: Typeface = SANS, shadow: Float = 0f) =
        TextPaint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG).apply {
            textSize = size
            this.color = color
            typeface = tf
            if (shadow > 0f) setShadowLayer(shadow, 0f, shadow * 0.4f, C.shadow)
        }

    private fun layout(
        text: CharSequence, p: TextPaint, width: Int, maxLines: Int = 2,
        align: Layout.Alignment = Layout.Alignment.ALIGN_NORMAL,
    ): StaticLayout = StaticLayout.Builder.obtain(text, 0, text.length, p, max(1, width))
        .setMaxLines(maxLines)
        .setEllipsize(TextUtils.TruncateAt.END)
        .setAlignment(align)
        .setIncludePad(false)
        .build()

    private fun Canvas.drawLayout(l: StaticLayout, x: Float, y: Float) {
        save(); translate(x, y); l.draw(this); restore()
    }

    private fun lineHeight(p: Paint): Float = p.fontMetrics.let { it.descent - it.ascent }
    private fun Canvas.text(s: String, x: Float, top: Float, p: Paint) = drawText(s, x, top - p.fontMetrics.ascent, p)

    private fun fill(color: Int) = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color }

    private fun coordsLine(d: StampData, o: StampOptions): String? {
        if (!o.showCoords) return null
        if (!d.hasFix) return "GPS: поиск сигнала…"
        val parts = mutableListOf(StampFormat.coords(d.latitude!!, d.longitude!!, o.coordFormat))
        if (o.showAltitude) {
            d.altitude?.let { parts += StampFormat.altitude(it) }
            d.accuracy?.let { parts += StampFormat.accuracy(it) }
        }
        return parts.joinToString("  ·  ")
    }

    private fun addressLine(d: StampData, o: StampOptions): String? =
        if (!o.showAddress) null else d.address?.takeIf { it.isNotBlank() }
            ?: if (d.hasFix) null else "Местоположение не определено"

    private fun projectLine(d: StampData, o: StampOptions) =
        d.project?.takeIf { o.showProject && it.isNotBlank() }

    private fun weatherLine(d: StampData, o: StampOptions) =
        d.weather?.takeIf { o.showWeather && it.isNotBlank() }

    /** Предупреждение о подмене GPS рисуется поверх любого шаблона и не отключается. */
    private fun mockBadge(c: Canvas, w: Int, u: Float) {
        val p = paint(11 * u, C.white, SANS_BOLD).apply { letterSpacing = 0.04f }
        val text = "⚠ КООРДИНАТЫ ПОДМЕНЕНЫ"
        val pad = 6 * u; val m = 10 * u
        val tw = p.measureText(text); val th = lineHeight(p)
        c.drawRoundRect(RectF(m, m, m + tw + 2 * pad, m + th + 2 * pad), 6 * u, 6 * u, fill(C.danger))
        c.text(text, m + pad, m + pad, p)
    }

    private fun noteLine(d: StampData, o: StampOptions) =
        d.note?.takeIf { o.showNote && it.isNotBlank() }

    /** Стек текстовых блоков: считаем высоту заранее, чтобы нарисовать подложку под текстом. */
    private class Stack(private val gap: Float) {
        val items = mutableListOf<StaticLayout>()
        fun add(l: StaticLayout?) { if (l != null) items += l }
        val height: Float get() = if (items.isEmpty()) 0f else items.sumOf { it.height.toDouble() }.toFloat() + gap * (items.size - 1)
        fun draw(c: Canvas, x: Float, y: Float) {
            var yy = y
            for (l in items) { c.drawLayout(l, x, yy); yy += l.height + gap }
        }
    }

    // ---------- templates ----------

    private fun classic(c: Canvas, w: Int, h: Int, u: Float, d: StampData, o: StampOptions) {
        val m = 12 * u; val pad = 12 * u
        val panelW = w - 2 * m
        val innerW = (panelW - 2 * pad).toInt()

        val timeP = paint(38 * u, C.white, SANS_BOLD)
        val dateP = paint(14 * u, C.white, SANS_BOLD)
        val dayP = paint(12 * u, C.muted)
        val labelP = paint(11 * u, C.accent, SANS_BOLD).apply { letterSpacing = 0.08f }
        val bodyP = paint(13 * u, C.white)
        val monoP = paint(11 * u, C.muted, MONO)
        val noteP = paint(12 * u, C.white, SANS_ITALIC)

        val time = StampFormat.time(d.timeMillis)
        val timeW = timeP.measureText(time)
        val headerH = lineHeight(timeP)

        val stack = Stack(4 * u).apply {
            addressLine(d, o)?.let { add(layout(it, bodyP, innerW, 2)) }
            coordsLine(d, o)?.let { add(layout(it, monoP, innerW, 1)) }
            weatherLine(d, o)?.let { add(layout(it, monoP, innerW, 1)) }
            noteLine(d, o)?.let { add(layout(it, noteP, innerW, 2)) }
        }
        val project = projectLine(d, o)?.let { layout(it.uppercase(StampFormat.RU), labelP, innerW, 1) }

        var total = pad + headerH + pad
        if (project != null) total += project.height + 6 * u
        if (stack.items.isNotEmpty()) total += 8 * u + stack.height

        val top = h - m - total
        c.drawRoundRect(RectF(m, top, w - m, h - m), 12 * u, 12 * u, fill(C.panel))

        var y = top + pad
        val x = m + pad
        if (project != null) { c.drawLayout(project, x, y); y += project.height + 6 * u }
        c.text(time, x, y, timeP)
        // вертикальная акцентная черта + дата/день недели справа от времени
        val barX = x + timeW + 12 * u
        c.drawRoundRect(RectF(barX, y + 6 * u, barX + 3 * u, y + headerH - 4 * u), 2 * u, 2 * u, fill(C.accent))
        val colX = barX + 11 * u
        val dateH = lineHeight(dateP); val dayH = lineHeight(dayP)
        val colTop = y + (headerH - dateH - dayH) / 2
        c.text(StampFormat.date(d.timeMillis), colX, colTop, dateP)
        c.text(StampFormat.weekday(d.timeMillis), colX, colTop + dateH, dayP)
        y += headerH
        if (stack.items.isNotEmpty()) stack.draw(c, x, y + 8 * u)
    }

    private fun report(c: Canvas, w: Int, h: Int, u: Float, d: StampData, o: StampOptions) {
        val m = 12 * u; val pad = 10 * u
        val cardW = min(w - 2 * m, 320 * u)
        val labelW = 74 * u
        val valueW = (cardW - 2 * pad - labelW).toInt()

        val headP = paint(12 * u, C.ink, SANS_BOLD).apply { letterSpacing = 0.06f }
        val labelP = paint(11 * u, C.muted)
        val valueP = paint(12 * u, C.white, SANS_BOLD)
        val monoP = paint(11 * u, C.white, MONO)

        val rows = mutableListOf<Pair<String, StaticLayout>>()
        rows += "Дата" to layout("${StampFormat.date(d.timeMillis)}, ${StampFormat.weekday(d.timeMillis)}", valueP, valueW, 1)
        rows += "Время" to layout("${StampFormat.timeSec(d.timeMillis)}  ${StampFormat.utcOffset(d.timeMillis)}", valueP, valueW, 1)
        addressLine(d, o)?.let { rows += "Адрес" to layout(it, valueP, valueW, 3) }
        if (o.showCoords) {
            val txt = if (d.hasFix) StampFormat.coords(d.latitude!!, d.longitude!!, o.coordFormat).replace(", ", "\n").replace("  ", "\n") else "нет сигнала"
            rows += "Координаты" to layout(txt, monoP, valueW, 2)
        }
        if (o.showAltitude && d.hasFix) {
            val parts = listOfNotNull(d.altitude?.let { StampFormat.altitude(it) }, d.accuracy?.let { StampFormat.accuracy(it) })
            if (parts.isNotEmpty()) rows += "Высота/точн." to layout(parts.joinToString(" · "), monoP, valueW, 1)
        }
        weatherLine(d, o)?.let { rows += "Погода" to layout(it, valueP, valueW, 1) }
        noteLine(d, o)?.let { rows += "Примечание" to layout(it, valueP, valueW, 3) }

        val headText = (projectLine(d, o) ?: "ФОТООТЧЁТ").uppercase(StampFormat.RU)
        val head = layout(headText, headP, (cardW - 2 * pad).toInt(), 1)
        val headH = head.height + 2 * 7 * u
        val rowGap = 5 * u
        val bodyH = rows.sumOf { it.second.height.toDouble() }.toFloat() + rowGap * (rows.size - 1) + 2 * pad
        val top = h - m - headH - bodyH
        val r = 10 * u
        // тело
        c.drawRoundRect(RectF(m, top, m + cardW, h - m), r, r, fill(C.panelSolid))
        // шапка акцентом (скругление только сверху)
        c.save()
        c.clipRect(m, top, m + cardW, top + headH)
        c.drawRoundRect(RectF(m, top, m + cardW, top + headH + r), r, r, fill(C.accent))
        c.restore()
        c.drawLayout(head, m + pad, top + 7 * u)

        var y = top + headH + pad
        for ((label, value) in rows) {
            c.text(label, m + pad, y, labelP)
            c.drawLayout(value, m + pad + labelW, y)
            y += value.height + rowGap
        }
    }

    private fun badge(c: Canvas, w: Int, h: Int, u: Float, d: StampData, o: StampOptions) {
        val m = 12 * u; val pad = 10 * u
        val cardW = min(w - 2 * m, 330 * u)

        val timeP = paint(28 * u, C.ink, SANS_BOLD)
        val dateP = paint(11 * u, C.ink, SANS_BOLD)
        val time = StampFormat.time(d.timeMillis)
        val blockW = max(timeP.measureText(time), dateP.measureText(StampFormat.date(d.timeMillis))) + 2 * pad
        val rightW = (cardW - blockW - 2 * pad).toInt()

        val placeP = paint(14 * u, C.white, SANS_BOLD)
        val bodyP = paint(11 * u, C.muted)
        val monoP = paint(10 * u, C.muted, MONO)
        val stack = Stack(3 * u).apply {
            val place = projectLine(d, o) ?: d.locality ?: StampFormat.weekday(d.timeMillis).replaceFirstChar { it.titlecase(StampFormat.RU) }
            add(layout(place, placeP, rightW, 1))
            addressLine(d, o)?.let { add(layout(it, bodyP, rightW, 2)) }
            coordsLine(d, o)?.let { add(layout(it, monoP, rightW, 2)) }
            weatherLine(d, o)?.let { add(layout(it, monoP, rightW, 1)) }
            noteLine(d, o)?.let { add(layout(it, bodyP, rightW, 1)) }
        }
        val leftH = lineHeight(timeP) + lineHeight(dateP) + 2 * pad
        val cardH = max(leftH, stack.height + 2 * pad)
        val top = h - m - cardH
        val r = 12 * u
        c.drawRoundRect(RectF(m, top, m + cardW, h - m), r, r, fill(C.panelSolid))
        c.save()
        c.clipRect(m, top, m + blockW, h - m)
        c.drawRoundRect(RectF(m, top, m + blockW + r, h - m), r, r, fill(C.accent))
        c.restore()
        val ly = top + (cardH - lineHeight(timeP) - lineHeight(dateP)) / 2
        c.text(time, m + pad, ly, timeP)
        c.text(StampFormat.date(d.timeMillis), m + pad, ly + lineHeight(timeP), dateP)
        stack.draw(c, m + blockW + pad, top + (cardH - stack.height) / 2)
    }

    private fun minimal(c: Canvas, w: Int, h: Int, u: Float, d: StampData, o: StampOptions) {
        val m = 14 * u
        val width = (w * 0.78f).toInt()
        val sh = 3 * u
        val headP = paint(18 * u, C.white, SANS_BOLD, sh)
        val bodyP = paint(12 * u, C.white, SANS, sh)
        val right = Layout.Alignment.ALIGN_OPPOSITE
        val stack = Stack(2 * u).apply {
            projectLine(d, o)?.let { add(layout(it, paint(12 * u, C.accent, SANS_BOLD, sh), width, 1, right)) }
            add(layout("${StampFormat.date(d.timeMillis)}  ${StampFormat.time(d.timeMillis)}", headP, width, 1, right))
            addressLine(d, o)?.let { add(layout(it, bodyP, width, 2, right)) }
            coordsLine(d, o)?.let { add(layout(it, bodyP, width, 1, right)) }
            weatherLine(d, o)?.let { add(layout(it, bodyP, width, 1, right)) }
            noteLine(d, o)?.let { add(layout(it, bodyP, width, 2, right)) }
        }
        stack.draw(c, w - m - width, h - m - stack.height)
    }

    private fun tech(c: Canvas, w: Int, h: Int, u: Float, d: StampData, o: StampOptions) {
        val pad = 10 * u
        val innerW = (w - 2 * pad).toInt()
        val keyP = paint(11 * u, C.accent, MONO_BOLD)
        val valP = paint(11 * u, C.white, MONO)
        val keyW = keyP.measureText("ACC ")
        val vW = (innerW - keyW).toInt()

        val rows = mutableListOf<Pair<String, StaticLayout>>()
        if (d.hasFix) {
            rows += "LAT" to layout(StampFormat.dms(d.latitude!!, "N", "S") + String.format(java.util.Locale.US, "  (%.6f)", d.latitude), valP, vW, 1)
            rows += "LON" to layout(StampFormat.dms(d.longitude!!, "E", "W") + String.format(java.util.Locale.US, "  (%.6f)", d.longitude), valP, vW, 1)
            val extra = listOfNotNull(d.altitude?.let { "ALT ${Math.round(it)} m" }, d.accuracy?.let { "±${Math.round(it)} m" })
            if (extra.isNotEmpty()) rows += "ACC" to layout(extra.joinToString("   "), valP, vW, 1)
        } else {
            rows += "GPS" to layout("NO FIX", valP, vW, 1)
        }
        rows += "UTC" to layout("${StampFormat.iso(d.timeMillis)} ${StampFormat.timeSec(d.timeMillis)} ${StampFormat.utcOffset(d.timeMillis)}", valP, vW, 1)
        addressLine(d, o)?.let { rows += "ADR" to layout(it, valP, vW, 2) }
        projectLine(d, o)?.let { rows += "OBJ" to layout(it, valP, vW, 1) }
        weatherLine(d, o)?.let { rows += "WX" to layout(it, valP, vW, 1) }
        noteLine(d, o)?.let { rows += "TXT" to layout(it, valP, vW, 2) }

        val gap = 3 * u
        val bodyH = rows.sumOf { it.second.height.toDouble() }.toFloat() + gap * (rows.size - 1)
        val top = h - bodyH - 2 * pad
        c.drawRect(0f, top, w.toFloat(), h.toFloat(), fill(C.panel))
        c.drawRect(0f, top, w.toFloat(), top + 2 * u, fill(C.accent))
        var y = top + pad
        for ((k, v) in rows) {
            c.text(k, pad, y, keyP)
            c.drawLayout(v, pad + keyW, y)
            y += v.height + gap
        }
    }

    private fun travel(c: Canvas, w: Int, h: Int, u: Float, d: StampData, o: StampOptions) {
        val m = 18 * u
        val width = (w - 2 * m).toInt()
        val sh = 4 * u
        val center = Layout.Alignment.ALIGN_CENTER
        val bigP = paint(40 * u, C.white, SERIF_BI, sh)
        val placeP = paint(15 * u, C.white, SANS_BOLD, sh).apply { letterSpacing = 0.12f }
        val smallP = paint(12 * u, C.white, SANS, sh)

        val big = layout(StampFormat.dayMonth(d.timeMillis), bigP, width, 1, center)
        val place = (projectLine(d, o) ?: d.locality ?: addressLine(d, o))?.let {
            layout(it.uppercase(StampFormat.RU), placeP, width, 1, center)
        }
        val meta = listOfNotNull(
            StampFormat.year(d.timeMillis), StampFormat.time(d.timeMillis),
            if (o.showCoords && d.hasFix) StampFormat.coords(d.latitude!!, d.longitude!!, CoordFormat.DECIMAL) else null,
            weatherLine(d, o),
        ).joinToString("  ·  ")
        val small = layout(meta, smallP, width, 2, center)
        val note = noteLine(d, o)?.let { layout(it, smallP, width, 2, center) }

        val lineGap = 8 * u
        var total = big.height + lineGap + 1.5f * u + lineGap + small.height
        if (place != null) total += place.height + 4 * u
        if (note != null) total += note.height + 4 * u
        var y = h - m - total
        c.drawLayout(big, m, y); y += big.height + lineGap
        val lineW = 56 * u
        c.drawRect(w / 2f - lineW / 2, y, w / 2f + lineW / 2, y + 1.5f * u, fill(C.accent)); y += 1.5f * u + lineGap
        if (place != null) { c.drawLayout(place, m, y); y += place.height + 4 * u }
        c.drawLayout(small, m, y); y += small.height + 4 * u
        if (note != null) c.drawLayout(note, m, y)
    }
}
