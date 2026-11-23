package com.geostamp.app

import android.app.Application
import android.content.Context
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.work.Configuration
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.VideoFrameDecoder
import com.geostamp.app.camera.CaptureProcessor
import com.geostamp.app.data.MediaRepository
import com.geostamp.app.data.SettingsRepository
import com.geostamp.app.drive.DriveSync
import com.geostamp.app.location.LocationProvider
import com.geostamp.app.security.AppLock
import com.geostamp.app.security.PinManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.Dispatchers

/** Ручной DI: синглтоны приложения без кодогенерации — быстрый старт и простая сборка. */
class AppContainer(val context: Context) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val settings = SettingsRepository(context)
    val media = MediaRepository(context, scope)
    val weather = com.geostamp.app.weather.WeatherProvider()
    val location = LocationProvider(context, scope, weather)
    val pin = PinManager(settings)
    val lock = AppLock(settings, scope)
    val drive = DriveSync(context)
    val processor = CaptureProcessor(this)
}

class GeoStampApp : Application(), ImageLoaderFactory, Configuration.Provider {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        ProcessLifecycleOwner.get().lifecycle.addObserver(container.lock)
    }

    override fun newImageLoader(): ImageLoader = ImageLoader.Builder(this)
        .components { add(VideoFrameDecoder.Factory()) }
        .crossfade(true)
        .build()

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setMinimumLoggingLevel(android.util.Log.WARN).build()
}

val Context.container: AppContainer get() = (applicationContext as GeoStampApp).container
