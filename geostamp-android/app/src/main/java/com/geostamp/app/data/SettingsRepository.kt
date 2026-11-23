package com.geostamp.app.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.geostamp.app.stamp.CoordFormat
import com.geostamp.app.stamp.StampOptions
import com.geostamp.app.stamp.StampTemplate
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

enum class VideoQuality(val title: String) { SD("480p"), HD("720p"), FHD("1080p"), UHD("4K") }
enum class PhotoQuality(val title: String, val jpeg: Int) { ECONOMY("Эконом", 80), STANDARD("Стандарт", 90), MAX("Максимум", 98) }

data class AppSettings(
    // Штамп
    val template: StampTemplate = StampTemplate.CLASSIC,
    val showAddress: Boolean = true,
    val showCoords: Boolean = true,
    val showAltitude: Boolean = false,
    val showProject: Boolean = false,
    val showNote: Boolean = false,
    val showWeather: Boolean = true,
    val coordFormat: CoordFormat = CoordFormat.DECIMAL,
    val project: String = "",
    val note: String = "",
    // Камера
    val photoQuality: PhotoQuality = PhotoQuality.STANDARD,
    val videoQuality: VideoQuality = VideoQuality.FHD,
    val shutterSound: Boolean = true,
    val mirrorFront: Boolean = true,
    val grid: Boolean = false,
    val copyToGallery: Boolean = false,
    val liveClockInVideo: Boolean = true,
    // Безопасность
    val pinEnabled: Boolean = false,
    val pinHash: String = "",
    val pinSalt: String = "",
    val pinLength: Int = 4,
    val biometric: Boolean = false,
    val autoLockSec: Int = 30,
    val quickCameraBypass: Boolean = true,
    val secureScreen: Boolean = true,
    val failedAttempts: Int = 0,
    val lockoutUntil: Long = 0L,
    // Google Drive
    val driveConnected: Boolean = false,
    val autoUpload: Boolean = false,
    val wifiOnly: Boolean = true,
    val driveByProject: Boolean = true,
) {
    val stampOptions: StampOptions
        get() = StampOptions(showAddress, showCoords, showAltitude, showProject, showNote, coordFormat, showWeather)
}

private val Context.store by preferencesDataStore(name = "settings")

class SettingsRepository(private val context: Context) {

    private object K {
        val template = stringPreferencesKey("template")
        val showAddress = booleanPreferencesKey("showAddress")
        val showCoords = booleanPreferencesKey("showCoords")
        val showAltitude = booleanPreferencesKey("showAltitude")
        val showProject = booleanPreferencesKey("showProject")
        val showNote = booleanPreferencesKey("showNote")
        val showWeather = booleanPreferencesKey("showWeather")
        val coordFormat = stringPreferencesKey("coordFormat")
        val project = stringPreferencesKey("project")
        val note = stringPreferencesKey("note")
        val photoQuality = stringPreferencesKey("photoQuality")
        val videoQuality = stringPreferencesKey("videoQuality")
        val shutterSound = booleanPreferencesKey("shutterSound")
        val mirrorFront = booleanPreferencesKey("mirrorFront")
        val grid = booleanPreferencesKey("grid")
        val copyToGallery = booleanPreferencesKey("copyToGallery")
        val liveClock = booleanPreferencesKey("liveClock")
        val pinEnabled = booleanPreferencesKey("pinEnabled")
        val pinHash = stringPreferencesKey("pinHash")
        val pinSalt = stringPreferencesKey("pinSalt")
        val pinLength = intPreferencesKey("pinLength")
        val biometric = booleanPreferencesKey("biometric")
        val autoLockSec = intPreferencesKey("autoLockSec")
        val quickBypass = booleanPreferencesKey("quickBypass")
        val secureScreen = booleanPreferencesKey("secureScreen")
        val failedAttempts = intPreferencesKey("failedAttempts")
        val lockoutUntil = longPreferencesKey("lockoutUntil")
        val driveConnected = booleanPreferencesKey("driveConnected")
        val autoUpload = booleanPreferencesKey("autoUpload")
        val wifiOnly = booleanPreferencesKey("wifiOnly")
        val driveByProject = booleanPreferencesKey("driveByProject")
    }

    private inline fun <reified E : Enum<E>> Preferences.enum(key: Preferences.Key<String>, def: E): E =
        this[key]?.let { v -> enumValues<E>().firstOrNull { it.name == v } } ?: def

    val flow: Flow<AppSettings> = context.store.data.map { fromPrefs(it) }

    private fun fromPrefs(p: Preferences): AppSettings {
        val d = AppSettings()
        return AppSettings(
            template = p.enum(K.template, d.template),
            showAddress = p[K.showAddress] ?: d.showAddress,
            showCoords = p[K.showCoords] ?: d.showCoords,
            showAltitude = p[K.showAltitude] ?: d.showAltitude,
            showProject = p[K.showProject] ?: d.showProject,
            showNote = p[K.showNote] ?: d.showNote,
            showWeather = p[K.showWeather] ?: d.showWeather,
            coordFormat = p.enum(K.coordFormat, d.coordFormat),
            project = p[K.project] ?: d.project,
            note = p[K.note] ?: d.note,
            photoQuality = p.enum(K.photoQuality, d.photoQuality),
            videoQuality = p.enum(K.videoQuality, d.videoQuality),
            shutterSound = p[K.shutterSound] ?: d.shutterSound,
            mirrorFront = p[K.mirrorFront] ?: d.mirrorFront,
            grid = p[K.grid] ?: d.grid,
            copyToGallery = p[K.copyToGallery] ?: d.copyToGallery,
            liveClockInVideo = p[K.liveClock] ?: d.liveClockInVideo,
            pinEnabled = p[K.pinEnabled] ?: d.pinEnabled,
            pinHash = p[K.pinHash] ?: d.pinHash,
            pinSalt = p[K.pinSalt] ?: d.pinSalt,
            pinLength = p[K.pinLength] ?: d.pinLength,
            biometric = p[K.biometric] ?: d.biometric,
            autoLockSec = p[K.autoLockSec] ?: d.autoLockSec,
            quickCameraBypass = p[K.quickBypass] ?: d.quickCameraBypass,
            secureScreen = p[K.secureScreen] ?: d.secureScreen,
            failedAttempts = p[K.failedAttempts] ?: d.failedAttempts,
            lockoutUntil = p[K.lockoutUntil] ?: d.lockoutUntil,
            driveConnected = p[K.driveConnected] ?: d.driveConnected,
            autoUpload = p[K.autoUpload] ?: d.autoUpload,
            wifiOnly = p[K.wifiOnly] ?: d.wifiOnly,
            driveByProject = p[K.driveByProject] ?: d.driveByProject,
        )
    }

    suspend fun current(): AppSettings = flow.first()

    /** Атомарное обновление: читаем текущее состояние, применяем transform, пишем все поля. */
    suspend fun update(transform: (AppSettings) -> AppSettings) {
        context.store.edit { p ->
            val cur = fromPrefs(p)
            val s = transform(cur)
            p[K.template] = s.template.name
            p[K.showAddress] = s.showAddress
            p[K.showCoords] = s.showCoords
            p[K.showAltitude] = s.showAltitude
            p[K.showProject] = s.showProject
            p[K.showNote] = s.showNote
            p[K.showWeather] = s.showWeather
            p[K.coordFormat] = s.coordFormat.name
            p[K.project] = s.project
            p[K.note] = s.note
            p[K.photoQuality] = s.photoQuality.name
            p[K.videoQuality] = s.videoQuality.name
            p[K.shutterSound] = s.shutterSound
            p[K.mirrorFront] = s.mirrorFront
            p[K.grid] = s.grid
            p[K.copyToGallery] = s.copyToGallery
            p[K.liveClock] = s.liveClockInVideo
            p[K.pinEnabled] = s.pinEnabled
            p[K.pinHash] = s.pinHash
            p[K.pinSalt] = s.pinSalt
            p[K.pinLength] = s.pinLength
            p[K.biometric] = s.biometric
            p[K.autoLockSec] = s.autoLockSec
            p[K.quickBypass] = s.quickCameraBypass
            p[K.secureScreen] = s.secureScreen
            p[K.failedAttempts] = s.failedAttempts
            p[K.lockoutUntil] = s.lockoutUntil
            p[K.driveConnected] = s.driveConnected
            p[K.autoUpload] = s.autoUpload
            p[K.wifiOnly] = s.wifiOnly
            p[K.driveByProject] = s.driveByProject
        }
    }
}
