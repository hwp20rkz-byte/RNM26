package com.geostamp.app.share

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.FileProvider
import com.geostamp.app.data.MediaItem
import com.geostamp.app.data.MediaRepository
import com.geostamp.app.data.MediaType

object ShareHelper {
    private val WHATSAPP = listOf("com.whatsapp", "com.whatsapp.w4b") // обычный и Business

    fun whatsAppInstalled(context: Context): Boolean = WHATSAPP.any { installed(context, it) }

    private fun installed(context: Context, pkg: String): Boolean = try {
        context.packageManager.getPackageInfo(pkg, 0); true
    } catch (_: PackageManager.NameNotFoundException) { false }

    /**
     * Отправка фото и видео (одного или пачкой) в WhatsApp с подписью: время, адрес, ссылка на карту.
     * Если WhatsApp не установлен — системное меню «Поделиться».
     */
    fun share(context: Context, repo: MediaRepository, items: List<MediaItem>, caption: String?, toWhatsApp: Boolean) {
        if (items.isEmpty()) return
        val uris = ArrayList<Uri>(items.map { repo.uri(it) })
        val type = when {
            items.all { it.type == MediaType.PHOTO } -> "image/jpeg"
            items.all { it.type == MediaType.VIDEO } -> "video/mp4"
            else -> "*/*"
        }
        val intent = Intent(if (uris.size == 1) Intent.ACTION_SEND else Intent.ACTION_SEND_MULTIPLE).apply {
            this.type = type
            if (uris.size == 1) putExtra(Intent.EXTRA_STREAM, uris[0]) else putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
            if (!caption.isNullOrBlank()) putExtra(Intent.EXTRA_TEXT, caption)
            // ClipData нужен, чтобы грант на чтение распространился на все URI
            clipData = ClipData.newRawUri(null, uris[0]).apply { uris.drop(1).forEach { addItem(ClipData.Item(it)) } }
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val pkg = if (toWhatsApp) WHATSAPP.firstOrNull { installed(context, it) } else null
        if (pkg != null) {
            intent.setPackage(pkg)
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } else {
            context.startActivity(Intent.createChooser(intent, "Поделиться").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }

    const val DRIVE_APP = "com.google.android.apps.docs"

    fun driveAppInstalled(context: Context) = installed(context, DRIVE_APP)

    /**
     * Запасной путь без OAuth: передаём файлы приложению «Google Диск», оно само предлагает папку
     * и загружает. Работает сразу, без настройки Google Cloud — но без автозагрузки и папок по объектам.
     */
    fun sendToDriveApp(context: Context, repo: MediaRepository, items: List<MediaItem>) {
        if (items.isEmpty()) return
        val uris = ArrayList<Uri>(items.map { repo.uri(it) })
        val intent = Intent(if (uris.size == 1) Intent.ACTION_SEND else Intent.ACTION_SEND_MULTIPLE).apply {
            type = if (items.all { it.type == MediaType.PHOTO }) "image/jpeg" else if (items.all { it.type == MediaType.VIDEO }) "video/mp4" else "*/*"
            if (uris.size == 1) putExtra(Intent.EXTRA_STREAM, uris[0]) else putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
            clipData = ClipData.newRawUri(null, uris[0]).apply { uris.drop(1).forEach { addItem(ClipData.Item(it)) } }
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        if (driveAppInstalled(context)) context.startActivity(intent.setPackage(DRIVE_APP))
        else context.startActivity(Intent.createChooser(intent, "Сохранить на Диск").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** Готовый файл (PDF-отчёт) — в меню «Поделиться»: WhatsApp, почта, Диск и т.д. */
    fun shareFile(context: Context, file: java.io.File, mime: String, subject: String) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mime
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, subject)
            clipData = ClipData.newRawUri(null, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Отправить отчёт").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun openUrl(context: Context, url: String) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun openInMaps(context: Context, lat: Double, lon: Double) {
        val uri = Uri.parse("geo:$lat,$lon?q=$lat,$lon")
        context.startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun playVideo(context: Context, repo: MediaRepository, item: MediaItem) {
        val intent = Intent(Intent.ACTION_VIEW).setDataAndType(repo.uri(item), item.type.mime)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(Intent.createChooser(intent, "Открыть видео").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
