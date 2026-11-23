package com.geostamp.app.drive

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.geostamp.app.GeoStampApp
import com.geostamp.app.data.MediaItem
import com.geostamp.app.data.SyncState
import com.geostamp.app.stamp.StampData
import com.geostamp.app.stamp.StampFormat
import java.io.IOException
import java.util.concurrent.TimeUnit

class DriveSync(private val context: Context) {

    fun enqueue(ids: Collection<String>, wifiOnly: Boolean) {
        val wm = WorkManager.getInstance(context)
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED)
            .build()
        ids.forEach { id ->
            val req = OneTimeWorkRequestBuilder<DriveUploadWorker>()
                .setInputData(workDataOf(DriveUploadWorker.KEY_ID to id))
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .addTag(TAG)
                .build()
            wm.enqueueUniqueWork("drive-$id", ExistingWorkPolicy.KEEP, req)
        }
    }

    companion object { const val TAG = "drive-upload" }
}

class DriveUploadWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val app = applicationContext as GeoStampApp
        val media = app.container.media
        val id = inputData.getString(KEY_ID) ?: return Result.failure()
        val item = media.get(id) ?: return Result.success() // удалено — нечего грузить
        if (item.sync == SyncState.DONE) return Result.success()

        media.update(id) { it.copy(sync = SyncState.UPLOADING) }
        return try {
            val auth = DriveAuth.authorize(applicationContext)
            val token = auth.accessToken
            if (auth.hasResolution() || token == null) {
                media.update(id) { it.copy(sync = SyncState.NEEDS_AUTH) }
                app.container.settings.update { it.copy(driveConnected = false) }
                return Result.failure()
            }
            val settings = app.container.settings.current()
            val path = buildList {
                add("GeoStamp")
                if (settings.driveByProject && !item.project.isNullOrBlank()) add(item.project.take(80))
                add(StampFormat.iso(item.createdAt))
            }
            val api = DriveApi()
            val folder = api.ensurePath(token, path)
            val driveId = api.upload(
                token, media.file(item), item.type.mime, folder,
                description = StampFormat.caption(item.toStamp()),
                appProps = mapOf("sha256" to item.sha256, "mockLocation" to item.mockLocation.toString()),
            )
            media.update(id) { it.copy(sync = SyncState.DONE, driveFileId = driveId) }
            Result.success()
        } catch (e: IOException) {
            if (runAttemptCount < MAX_ATTEMPTS) {
                media.update(id) { it.copy(sync = SyncState.QUEUED) }
                Result.retry()
            } else {
                media.update(id) { it.copy(sync = SyncState.FAILED) }
                Result.failure()
            }
        } catch (e: Exception) {
            media.update(id) { it.copy(sync = SyncState.FAILED) }
            Result.failure()
        }
    }

    companion object {
        const val KEY_ID = "id"
        private const val MAX_ATTEMPTS = 6
    }
}

fun MediaItem.toStamp() = StampData(
    timeMillis = createdAt, latitude = latitude, longitude = longitude, altitude = altitude,
    accuracy = accuracy, address = address, project = project, note = note,
    weather = weather, mockLocation = mockLocation,
)
