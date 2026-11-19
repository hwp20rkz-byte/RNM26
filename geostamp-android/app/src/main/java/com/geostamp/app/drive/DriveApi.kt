package com.geostamp.app.drive

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

class DriveAuthException(msg: String) : IOException(msg)

/**
 * Минимальный клиент Drive REST v3 (scope drive.file — приложение видит только свои файлы).
 * Без тяжёлого google-api-client: OkHttp + org.json.
 */
class DriveApi(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(300, TimeUnit.SECONDS)
        .build(),
) {
    private val json = "application/json; charset=UTF-8".toMediaType()
    private val folderCache = HashMap<String, String>()

    private fun Request.Builder.auth(token: String) = header("Authorization", "Bearer $token")

    private fun check(code: Int, body: String?) {
        if (code == 401 || code == 403) throw DriveAuthException("Drive auth error $code: $body")
        if (code !in 200..299) throw IOException("Drive HTTP $code: $body")
    }

    /** Находит или создаёт папку по пути, например ["GeoStamp", "ЖК Северный", "2026-11-19"]. */
    fun ensurePath(token: String, path: List<String>): String {
        var parent = "root"
        for (name in path) parent = ensureFolder(token, name, parent)
        return parent
    }

    private fun ensureFolder(token: String, name: String, parent: String): String {
        val key = "$parent/$name"
        folderCache[key]?.let { return it }
        val safe = name.replace("\\", "\\\\").replace("'", "\\'")
        val q = "name = '$safe' and mimeType = 'application/vnd.google-apps.folder' and '$parent' in parents and trashed = false"
        val url = okhttp3.HttpUrl.Builder().scheme("https").host("www.googleapis.com")
            .addPathSegments("drive/v3/files")
            .addQueryParameter("q", q)
            .addQueryParameter("fields", "files(id)")
            .addQueryParameter("spaces", "drive")
            .build()
        http.newCall(Request.Builder().url(url).auth(token).build()).execute().use { r ->
            val body = r.body?.string()
            check(r.code, body)
            val files = JSONObject(body ?: "{}").optJSONArray("files")
            if (files != null && files.length() > 0) {
                return files.getJSONObject(0).getString("id").also { folderCache[key] = it }
            }
        }
        val meta = JSONObject().put("name", name).put("mimeType", "application/vnd.google-apps.folder")
            .put("parents", JSONArray().put(parent))
        val req = Request.Builder().url("https://www.googleapis.com/drive/v3/files?fields=id")
            .auth(token).post(meta.toString().toRequestBody(json)).build()
        http.newCall(req).execute().use { r ->
            val body = r.body?.string()
            check(r.code, body)
            return JSONObject(body!!).getString("id").also { folderCache[key] = it }
        }
    }

    /** Resumable upload — устойчив для больших видео. Возвращает id файла в Drive. */
    fun upload(token: String, file: File, mime: String, parentId: String, description: String,
               appProps: Map<String, String> = emptyMap()): String {
        val meta = JSONObject()
            .put("name", file.name)
            .put("parents", JSONArray().put(parentId))
            .put("description", description)
        if (appProps.isNotEmpty()) meta.put("appProperties", JSONObject(appProps))
        val init = Request.Builder()
            .url("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id")
            .auth(token)
            .header("X-Upload-Content-Type", mime)
            .header("X-Upload-Content-Length", file.length().toString())
            .post(meta.toString().toRequestBody(json))
            .build()
        val session = http.newCall(init).execute().use { r ->
            check(r.code, r.body?.string())
            r.header("Location") ?: throw IOException("No upload session URL")
        }
        val put = Request.Builder().url(session).put(file.asRequestBody(mime.toMediaType())).build()
        http.newCall(put).execute().use { r ->
            val body = r.body?.string()
            check(r.code, body)
            return JSONObject(body!!).getString("id")
        }
    }
}
