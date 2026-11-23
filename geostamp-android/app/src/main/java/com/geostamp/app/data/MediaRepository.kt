package com.geostamp.app.data

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest
import java.util.UUID

enum class MediaType(val mime: String, val ext: String) { PHOTO("image/jpeg", "jpg"), VIDEO("video/mp4", "mp4") }
enum class SyncState { NONE, QUEUED, UPLOADING, DONE, FAILED, NEEDS_AUTH }

data class MediaItem(
    val id: String,
    val type: MediaType,
    val fileName: String,
    val createdAt: Long,
    val latitude: Double?,
    val longitude: Double?,
    val altitude: Double?,
    val accuracy: Float?,
    val address: String?,
    val project: String?,
    val note: String?,
    val sha256: String,
    val weather: String? = null,
    val mockLocation: Boolean = false,
    val sync: SyncState = SyncState.NONE,
    val driveFileId: String? = null,
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id); put("type", type.name); put("file", fileName); put("t", createdAt)
        latitude?.let { put("lat", it) }; longitude?.let { put("lon", it) }
        altitude?.let { put("alt", it) }; accuracy?.let { put("acc", it.toDouble()) }
        address?.let { put("addr", it) }; project?.let { put("proj", it) }; note?.let { put("note", it) }
        put("sha", sha256); put("sync", sync.name); driveFileId?.let { put("drive", it) }
        weather?.let { put("wx", it) }; if (mockLocation) put("mock", true)
    }

    companion object {
        fun fromJson(o: JSONObject) = MediaItem(
            id = o.getString("id"),
            type = MediaType.valueOf(o.getString("type")),
            fileName = o.getString("file"),
            createdAt = o.getLong("t"),
            latitude = o.optDoubleOrNull("lat"),
            longitude = o.optDoubleOrNull("lon"),
            altitude = o.optDoubleOrNull("alt"),
            accuracy = o.optDoubleOrNull("acc")?.toFloat(),
            address = o.optStringOrNull("addr"),
            project = o.optStringOrNull("proj"),
            note = o.optStringOrNull("note"),
            sha256 = o.optString("sha"),
            sync = runCatching { SyncState.valueOf(o.optString("sync")) }.getOrDefault(SyncState.NONE),
            driveFileId = o.optStringOrNull("drive"),
            weather = o.optStringOrNull("wx"),
            mockLocation = o.optBoolean("mock", false),
        )

        private fun JSONObject.optDoubleOrNull(k: String) = if (has(k) && !isNull(k)) optDouble(k) else null
        private fun JSONObject.optStringOrNull(k: String) = if (has(k) && !isNull(k)) optString(k) else null
    }
}

/**
 * Приватное хранилище снимков: файлы в filesDir/media (недоступны другим приложениям
 * и галерее — их закрывает PIN), индекс в JSON. Галерея телефона получает копию только по настройке.
 */
class MediaRepository(private val context: Context, private val scope: CoroutineScope) {

    val dir: File = File(context.filesDir, "media").apply { mkdirs() }
    private val indexFile = File(context.filesDir, "media_index.json")
    private val mutex = Mutex()
    private val _items = MutableStateFlow<List<MediaItem>>(emptyList())
    val items: StateFlow<List<MediaItem>> = _items.asStateFlow()

    init {
        scope.launch(Dispatchers.IO) { mutex.withLock { _items.value = load() } }
    }

    private fun load(): List<MediaItem> = runCatching {
        if (!indexFile.exists()) return emptyList()
        val arr = JSONArray(indexFile.readText())
        (0 until arr.length()).map { MediaItem.fromJson(arr.getJSONObject(it)) }
            .filter { File(dir, it.fileName).exists() }
            .sortedByDescending { it.createdAt }
    }.getOrDefault(emptyList())

    private fun persist(list: List<MediaItem>) {
        val tmp = File(indexFile.parentFile, indexFile.name + ".tmp")
        tmp.writeText(JSONArray().apply { list.forEach { put(it.toJson()) } }.toString())
        tmp.renameTo(indexFile)
    }

    fun newFile(type: MediaType, stamp: String): File =
        File(dir, "GS_${stamp}_${UUID.randomUUID().toString().take(4)}.${type.ext}")

    fun file(item: MediaItem) = File(dir, item.fileName)

    fun uri(item: MediaItem): Uri =
        FileProvider.getUriForFile(context, "${context.packageName}.files", file(item))

    fun get(id: String): MediaItem? = _items.value.firstOrNull { it.id == id }

    suspend fun add(item: MediaItem) = withContext(Dispatchers.IO) {
        mutex.withLock {
            val list = listOf(item) + _items.value
            persist(list); _items.value = list
        }
    }

    suspend fun update(id: String, transform: (MediaItem) -> MediaItem) = withContext(Dispatchers.IO) {
        mutex.withLock {
            val list = _items.value.map { if (it.id == id) transform(it) else it }
            persist(list); _items.value = list
        }
    }

    suspend fun delete(ids: Set<String>) = withContext(Dispatchers.IO) {
        mutex.withLock {
            _items.value.filter { it.id in ids }.forEach { file(it).delete() }
            val list = _items.value.filterNot { it.id in ids }
            persist(list); _items.value = list
        }
    }

    /** Копия в общую галерею: Pictures/GeoStamp или Movies/GeoStamp. */
    suspend fun exportToGallery(item: MediaItem): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            val src = file(item)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val isPhoto = item.type == MediaType.PHOTO
                val collection = if (isPhoto) MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                else MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, src.name)
                    put(MediaStore.MediaColumns.MIME_TYPE, item.type.mime)
                    put(MediaStore.MediaColumns.RELATIVE_PATH,
                        (if (isPhoto) Environment.DIRECTORY_PICTURES else Environment.DIRECTORY_MOVIES) + "/GeoStamp")
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }
                val resolver = context.contentResolver
                val uri = resolver.insert(collection, values) ?: return@runCatching false
                resolver.openOutputStream(uri)?.use { out -> src.inputStream().use { it.copyTo(out) } }
                values.clear(); values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
                true
            } else {
                @Suppress("DEPRECATION")
                val base = Environment.getExternalStoragePublicDirectory(
                    if (item.type == MediaType.PHOTO) Environment.DIRECTORY_PICTURES else Environment.DIRECTORY_MOVIES)
                val dst = File(base, "GeoStamp").apply { mkdirs() }.let { File(it, src.name) }
                src.copyTo(dst, overwrite = true)
                MediaScannerConnection.scanFile(context, arrayOf(dst.absolutePath), arrayOf(item.type.mime), null)
                true
            }
        }.getOrDefault(false)
    }

    companion object {
        fun sha256(file: File): String {
            val md = MessageDigest.getInstance("SHA-256")
            FileInputStream(file).use { input ->
                val buf = ByteArray(64 * 1024)
                while (true) {
                    val n = input.read(buf)
                    if (n < 0) break
                    md.update(buf, 0, n)
                }
            }
            return md.digest().joinToString("") { "%02x".format(it) }
        }
    }
}
