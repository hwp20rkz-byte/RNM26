package com.geostamp.app.camera

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.PorterDuff
import android.net.Uri
import android.os.Build
import androidx.annotation.OptIn
import androidx.exifinterface.media.ExifInterface
import androidx.media3.common.MediaItem as M3Item
import androidx.media3.common.util.UnstableApi
import androidx.media3.common.Effect
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.TextureOverlay
import androidx.media3.common.util.Size
import androidx.media3.effect.OverlayEffect
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import com.geostamp.app.AppContainer
import com.geostamp.app.data.AppSettings
import com.geostamp.app.data.MediaItem
import com.geostamp.app.data.MediaRepository
import com.geostamp.app.data.MediaType
import com.geostamp.app.data.SyncState
import com.geostamp.app.stamp.StampData
import com.geostamp.app.stamp.StampFormat
import com.geostamp.app.stamp.StampRenderer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Постобработка: «вжигание» штампа в фото/видео, EXIF, SHA-256, индекс, галерея, автозагрузка. */
class CaptureProcessor(private val c: AppContainer) {

    suspend fun processPhoto(src: Bitmap, rotation: Int, mirror: Boolean, stamp: StampData, s: AppSettings): MediaItem =
        withContext(Dispatchers.Default) {
            val matrix = Matrix().apply {
                postRotate(rotation.toFloat())
                if (mirror) postScale(-1f, 1f)
            }
            var bmp = if (rotation != 0 || mirror) Bitmap.createBitmap(src, 0, 0, src.width, src.height, matrix, true) else src
            if (bmp !== src) src.recycle()
            if (!bmp.isMutable) bmp = bmp.copy(Bitmap.Config.ARGB_8888, true).also { bmp.recycle() }

            StampRenderer.draw(Canvas(bmp), bmp.width, bmp.height, stamp, s.template, s.stampOptions)

            val file = c.media.newFile(MediaType.PHOTO, StampFormat.fileStamp(stamp.timeMillis))
            withContext(Dispatchers.IO) {
                FileOutputStream(file).use { bmp.compress(Bitmap.CompressFormat.JPEG, s.photoQuality.jpeg, it) }
                bmp.recycle()
                writeExif(file, stamp)
            }
            finish(file, MediaType.PHOTO, stamp, s)
        }

    private fun writeExif(file: File, d: StampData) = runCatching {
        val exif = ExifInterface(file)
        val dt = SimpleDateFormat("yyyy:MM:dd HH:mm:ss", Locale.US).format(Date(d.timeMillis))
        exif.setAttribute(ExifInterface.TAG_DATETIME_ORIGINAL, dt)
        exif.setAttribute(ExifInterface.TAG_DATETIME, dt)
        exif.setAttribute(ExifInterface.TAG_SOFTWARE, "GeoStamp")
        exif.setAttribute(ExifInterface.TAG_MAKE, Build.MANUFACTURER)
        exif.setAttribute(ExifInterface.TAG_MODEL, Build.MODEL)
        if (d.latitude != null && d.longitude != null) {
            exif.setLatLong(d.latitude, d.longitude)
            d.altitude?.let { exif.setAltitude(it) }
        }
        val desc = listOfNotNull(d.project, d.address, d.note).joinToString(" | ")
        if (desc.isNotBlank()) exif.setAttribute(ExifInterface.TAG_IMAGE_DESCRIPTION, desc)
        exif.saveAttributes()
    }

    /**
     * Видео: CameraX пишет «чистый» файл, затем Media3 Transformer накладывает штамп на каждый кадр
     * через StampVideoOverlay. Часы в штампе идут вместе с видео (опция «живые часы»).
     */
    @OptIn(UnstableApi::class)
    suspend fun processVideo(raw: File, startStamp: StampData, s: AppSettings): MediaItem {
        val out = c.media.newFile(MediaType.VIDEO, StampFormat.fileStamp(startStamp.timeMillis))
        val overlay = StampVideoOverlay(startStamp, s)
        val edited = EditedMediaItem.Builder(M3Item.fromUri(Uri.fromFile(raw)))
            .setEffects(Effects(emptyList(), listOf<Effect>(OverlayEffect(listOf<TextureOverlay>(overlay)))))
            .build()

        withContext(Dispatchers.Main) {
            suspendCancellableCoroutine { cont ->
                val transformer = Transformer.Builder(c.context)
                    .addListener(object : Transformer.Listener {
                        override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                            if (cont.isActive) cont.resume(Unit)
                        }
                        override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
                            if (cont.isActive) cont.resumeWithException(exportException)
                        }
                    })
                    .build()
                transformer.start(edited, out.absolutePath)
                cont.invokeOnCancellation { transformer.cancel() }
            }
        }
        raw.delete()
        return finish(out, MediaType.VIDEO, startStamp, s)
    }

    private suspend fun finish(file: File, type: MediaType, d: StampData, s: AppSettings): MediaItem {
        val sha = withContext(Dispatchers.IO) { MediaRepository.sha256(file) }
        val item = MediaItem(
            id = UUID.randomUUID().toString(), type = type, fileName = file.name, createdAt = d.timeMillis,
            latitude = d.latitude, longitude = d.longitude, altitude = d.altitude, accuracy = d.accuracy,
            address = d.address, project = d.project, note = d.note, sha256 = sha,
            sync = if (s.autoUpload && s.driveConnected) SyncState.QUEUED else SyncState.NONE,
        )
        c.media.add(item)
        if (s.copyToGallery) c.media.exportToGallery(item)
        if (s.autoUpload && s.driveConnected) c.drive.enqueue(listOf(item.id), s.wifiOnly)
        return item
    }
}

/**
 * Оверлей штампа для Media3 (аналог CanvasOverlay, которого нет в 1.5.x): bitmap размером с кадр,
 * перерисовывается раз в секунду. BitmapOverlay заливает текстуру в GPU только при смене
 * generationId bitmap — остальные кадры идут без копирования.
 */
@OptIn(UnstableApi::class)
private class StampVideoOverlay(private val start: StampData, private val s: AppSettings) : BitmapOverlay() {
    private var bitmap: Bitmap? = null
    private var canvas: Canvas? = null
    private var lastSecond = -1L

    override fun configure(videoSize: Size) {
        super.configure(videoSize)
        val w = videoSize.width.coerceAtLeast(1)
        val h = videoSize.height.coerceAtLeast(1)
        if (bitmap?.width != w || bitmap?.height != h) {
            bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).also { canvas = Canvas(it) }
            lastSecond = -1L
        }
    }

    override fun getBitmap(presentationTimeUs: Long): Bitmap {
        val bmp = bitmap ?: Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888).also { bitmap = it; canvas = Canvas(it) }
        val c = canvas!!
        val sec = presentationTimeUs / 1_000_000
        if (sec != lastSecond && (s.liveClockInVideo || lastSecond < 0)) {
            lastSecond = sec
            c.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
            val t = if (s.liveClockInVideo) start.timeMillis + presentationTimeUs / 1000 else start.timeMillis
            StampRenderer.draw(c, bmp.width, bmp.height, start.copy(timeMillis = t), s.template, s.stampOptions)
        }
        return bmp
    }

    override fun release() {
        super.release()
        bitmap?.recycle(); bitmap = null; canvas = null
    }
}
