package com.geostamp.app.report

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.media.MediaMetadataRetriever
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import androidx.core.graphics.ColorUtils
import com.geostamp.app.data.MediaItem
import com.geostamp.app.data.MediaRepository
import com.geostamp.app.data.MediaType
import com.geostamp.app.stamp.CoordFormat
import com.geostamp.app.stamp.StampFormat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

/**
 * Фотоотчёт в PDF (A4) встроенным android.graphics.pdf.PdfDocument — без сторонних библиотек.
 * По 2 снимка на страницу: превью слева, таблица справа (время, адрес, координаты, погода,
 * объект, примечание, проверка GPS, SHA-256 для проверки подлинности).
 */
object PdfReport {
    private const val W = 595 // A4 в пунктах (1/72")
    private const val H = 842
    private const val M = 36f
    private const val PER_PAGE = 2
    private const val HEADER_H = 64f
    private const val FOOTER_H = 24f
    private const val IMG_W = 220f
    private const val GAP = 14f

    private val ink = ColorUtils.HSLToColor(floatArrayOf(222f, 0.20f, 0.12f))
    private val muted = ColorUtils.HSLToColor(floatArrayOf(220f, 0.10f, 0.42f))
    private val accent = ColorUtils.HSLToColor(floatArrayOf(24f, 1.00f, 0.50f))
    private val line = ColorUtils.HSLToColor(floatArrayOf(220f, 0.12f, 0.86f))
    private val danger = ColorUtils.HSLToColor(floatArrayOf(0f, 0.75f, 0.45f))
    private val ok = ColorUtils.HSLToColor(floatArrayOf(145f, 0.55f, 0.32f))

    suspend fun build(context: Context, repo: MediaRepository, selected: List<MediaItem>): File = withContext(Dispatchers.IO) {
        val items = selected.sortedBy { it.createdAt }
        val pages = (items.size + PER_PAGE - 1) / PER_PAGE
        val doc = PdfDocument()
        try {
            items.chunked(PER_PAGE).forEachIndexed { pi, chunk ->
                val page = doc.startPage(PdfDocument.PageInfo.Builder(W, H, pi + 1).create())
                val c = page.canvas
                header(c, items)
                val blockH = (H - 2 * M - HEADER_H - FOOTER_H) / PER_PAGE
                chunk.forEachIndexed { i, item ->
                    val top = M + HEADER_H + i * blockH
                    entry(c, repo, item, pi * PER_PAGE + i + 1, top, blockH)
                }
                footer(c, pi + 1, pages)
                doc.finishPage(page)
            }
            val dir = File(context.filesDir, "reports").apply { mkdirs() }
            dir.listFiles()?.filter { System.currentTimeMillis() - it.lastModified() > 7 * 86_400_000L }?.forEach { it.delete() }
            val out = File(dir, "Фотоотчёт_${StampFormat.fileStamp(System.currentTimeMillis())}.pdf")
            FileOutputStream(out).use { doc.writeTo(it) }
            out
        } finally {
            doc.close()
        }
    }

    private fun tp(size: Float, color: Int, tf: Typeface = Typeface.SANS_SERIF) =
        TextPaint(Paint.ANTI_ALIAS_FLAG).apply { textSize = size; this.color = color; typeface = tf }

    private fun layout(text: CharSequence, p: TextPaint, width: Int, maxLines: Int) =
        StaticLayout.Builder.obtain(text, 0, text.length, p, max(1, width))
            .setMaxLines(maxLines).setEllipsize(TextUtils.TruncateAt.END)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL).setIncludePad(false).build()

    private fun Canvas.draw(l: StaticLayout, x: Float, y: Float) { save(); translate(x, y); l.draw(this); restore() }

    private fun header(c: Canvas, items: List<MediaItem>) {
        val bold = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        c.drawRect(M, M, M + 4f, M + 40f, Paint().apply { color = accent })
        val projects = items.mapNotNull { it.project?.takeIf(String::isNotBlank) }.distinct()
        val title = if (projects.size == 1) "Фотоотчёт: ${projects[0]}" else "Фотоотчёт"
        c.draw(layout(title, tp(18f, ink, bold), (W - 2 * M - 12).toInt(), 1), M + 12, M)
        val from = StampFormat.date(items.first().createdAt)
        val to = StampFormat.date(items.last().createdAt)
        val period = if (from == to) from else "$from – $to"
        val mocks = items.count { it.mockLocation }
        val sub = "Период: $period  ·  Снимков: ${items.size}" + if (mocks > 0) "  ·  ⚠ с подменой GPS: $mocks" else ""
        c.draw(layout(sub, tp(10f, if (mocks > 0) danger else muted), (W - 2 * M - 12).toInt(), 1), M + 12, M + 24)
        c.drawLine(M, M + HEADER_H - 10, W - M, M + HEADER_H - 10, Paint().apply { color = line; strokeWidth = 0.8f })
    }

    private fun footer(c: Canvas, page: Int, total: Int) {
        val p = tp(8f, muted)
        val text = "GeoStamp · сформировано ${StampFormat.date(System.currentTimeMillis())} ${StampFormat.time(System.currentTimeMillis())}" +
            " · подлинность файла проверяется по SHA-256 · стр. $page из $total"
        c.draw(layout(text, p, (W - 2 * M).toInt(), 1), M, H - M - 10)
    }

    private fun entry(c: Canvas, repo: MediaRepository, item: MediaItem, n: Int, top: Float, blockH: Float) {
        val imgH = blockH - GAP
        // --- превью
        val frame = RectF(M, top, M + IMG_W, top + imgH)
        c.drawRect(frame, Paint().apply { color = line })
        thumbnail(repo, item)?.let { bmp ->
            val scale = min(frame.width() / bmp.width, frame.height() / bmp.height)
            val w = bmp.width * scale; val h = bmp.height * scale
            val dst = RectF(frame.left + (frame.width() - w) / 2, frame.top + (frame.height() - h) / 2, 0f, 0f)
            dst.right = dst.left + w; dst.bottom = dst.top + h
            c.drawBitmap(bmp, null, dst, Paint(Paint.FILTER_BITMAP_FLAG))
            bmp.recycle()
        }
        if (item.type == MediaType.VIDEO) {
            val p = tp(9f, ColorUtils.HSLToColor(floatArrayOf(0f, 0f, 1f)), Typeface.DEFAULT_BOLD)
            c.drawRect(frame.left, frame.top, frame.left + 44f, frame.top + 16f, Paint().apply { color = ink })
            c.drawText("ВИДЕО", frame.left + 6f, frame.top + 12f, p)
        }

        // --- таблица
        val x = M + IMG_W + GAP
        val colW = W - M - x
        val labelW = 72f
        val valueW = (colW - labelW).toInt()
        val bold = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
        val labelP = tp(8.5f, muted)
        val valueP = tp(9.5f, ink)
        val monoP = tp(7f, muted, Typeface.MONOSPACE)

        var y = top
        c.draw(layout("№ $n", tp(13f, accent, bold), colW.toInt(), 1), x, y); y += 20f

        val rows = mutableListOf<Triple<String, String, TextPaint>>()
        rows += Triple("Дата, время", "${StampFormat.date(item.createdAt)}, ${StampFormat.weekday(item.createdAt)}  " +
            "${StampFormat.timeSec(item.createdAt)} ${StampFormat.utcOffset(item.createdAt)}", valueP)
        item.project?.let { rows += Triple("Объект", it, valueP) }
        rows += Triple("Адрес", item.address ?: "не определён", valueP)
        if (item.latitude != null && item.longitude != null) {
            rows += Triple("Координаты", StampFormat.coords(item.latitude, item.longitude, CoordFormat.DECIMAL) + "\n" +
                StampFormat.coords(item.latitude, item.longitude, CoordFormat.DMS), valueP)
            rows += Triple("Карта", String.format(Locale.US, "maps.google.com/?q=%.6f,%.6f", item.latitude, item.longitude), valueP)
        }
        val extra = listOfNotNull(item.altitude?.let { StampFormat.altitude(it) }, item.accuracy?.let { "точность " + StampFormat.accuracy(it) })
        if (extra.isNotEmpty()) rows += Triple("Высота", extra.joinToString(", "), valueP)
        item.weather?.let { rows += Triple("Погода", it, valueP) }
        item.note?.let { rows += Triple("Примечание", it, valueP) }
        rows += Triple("Проверка GPS",
            if (item.mockLocation) "⚠ координаты подменены программой" else if (item.latitude != null) "✓ реальный GPS-сигнал" else "нет сигнала",
            tp(9.5f, if (item.mockLocation) danger else ok, bold))
        rows += Triple("Файл", item.fileName, valueP)

        val bottom = top + imgH
        for ((label, value, p) in rows) {
            val v = layout(value, p, valueW, 3)
            if (y + v.height > bottom - 30f) break // не вылезаем из блока
            c.draw(layout(label, labelP, labelW.toInt() - 4, 1), x, y + 1f)
            c.draw(v, x + labelW, y)
            y += v.height + 5f
        }
        c.draw(layout("SHA-256: ${item.sha256}", monoP, colW.toInt(), 2), x, bottom - 20f)
        c.drawLine(M, top + blockH - GAP / 2, W - M, top + blockH - GAP / 2, Paint().apply { color = line; strokeWidth = 0.5f })
    }

    /** Уменьшенная копия ~600 px: экономит память и вес PDF. */
    private fun thumbnail(repo: MediaRepository, item: MediaItem): Bitmap? = runCatching {
        val file = repo.file(item)
        if (item.type == MediaType.VIDEO) {
            val r = MediaMetadataRetriever()
            try {
                r.setDataSource(file.absolutePath)
                r.getFrameAtTime(0)?.let { scaleDown(it, 600) }
            } finally { r.release() }
        } else {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, bounds)
            var sample = 1
            while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= 600) sample *= 2
            BitmapFactory.decodeFile(file.absolutePath, BitmapFactory.Options().apply { inSampleSize = sample })
        }
    }.getOrNull()

    private fun scaleDown(b: Bitmap, maxSide: Int): Bitmap {
        val s = maxSide.toFloat() / max(b.width, b.height)
        if (s >= 1f) return b
        return Bitmap.createScaledBitmap(b, (b.width * s).toInt(), (b.height * s).toInt(), true).also { if (it !== b) b.recycle() }
    }
}
