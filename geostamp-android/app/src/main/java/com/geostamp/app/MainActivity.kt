package com.geostamp.app

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.geostamp.app.ui.camera.CameraScreen
import com.geostamp.app.ui.gallery.GalleryScreen
import com.geostamp.app.ui.gallery.ViewerScreen
import com.geostamp.app.ui.home.HomeScreen
import com.geostamp.app.ui.lock.LockScreen
import com.geostamp.app.ui.lock.PinSetupScreen
import com.geostamp.app.ui.settings.SettingsScreen
import com.geostamp.app.ui.templates.TemplatesScreen
import com.geostamp.app.ui.theme.GeoStampTheme
import com.geostamp.app.ui.theme.Tokens
import kotlinx.coroutines.flow.MutableStateFlow

object Routes {
    const val HOME = "home"
    const val CAMERA = "camera/{mode}"
    fun camera(video: Boolean) = "camera/${if (video) "video" else "photo"}"
    const val GALLERY = "gallery"
    const val VIEWER = "viewer/{id}"
    fun viewer(id: String) = "viewer/$id"
    const val TEMPLATES = "templates"
    const val SETTINGS = "settings"
    const val PIN_SETUP = "pin_setup"
}

class MainActivity : AppCompatActivity() {

    private val pendingRoute = MutableStateFlow<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        handleIntent(intent)
        val c = container
        setContent {
            GeoStampTheme {
                val settings by c.settings.flow.collectAsState(initial = null)
                val s = settings
                LaunchedEffect(s?.secureScreen) {
                    // FLAG_SECURE: нет скриншотов и превью в «недавних» — снимки не утекают с экрана
                    if (s?.secureScreen == true) window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
                    else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
                if (s == null) Box(Modifier.fillMaxSize().background(Tokens.Bg)) else AppNav(this, pendingRoute)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        pendingRoute.value = when (intent?.action) {
            ACTION_QUICK_PHOTO -> Routes.camera(false)
            ACTION_QUICK_VIDEO -> Routes.camera(true)
            ACTION_OPEN_GALLERY -> Routes.GALLERY
            else -> pendingRoute.value
        }
    }

    companion object {
        const val ACTION_QUICK_PHOTO = "com.geostamp.app.QUICK_PHOTO"
        const val ACTION_QUICK_VIDEO = "com.geostamp.app.QUICK_VIDEO"
        const val ACTION_OPEN_GALLERY = "com.geostamp.app.OPEN_GALLERY"
    }
}

@Composable
private fun AppNav(activity: MainActivity, pendingRoute: MutableStateFlow<String?>) {
    val c = activity.container
    val nav = rememberNavController()
    val settings by c.settings.flow.collectAsState(initial = null)
    val s = settings ?: return
    val locked by c.lock.locked.collectAsState()
    val pending by pendingRoute.collectAsState()
    val route = nav.currentBackStackEntryAsState().value?.destination?.route

    LaunchedEffect(pending) {
        val r = pending ?: return@LaunchedEffect
        nav.navigate(r) { launchSingleTop = true; popUpTo(Routes.HOME) }
        pendingRoute.value = null
    }

    // Быстрая камера может работать без PIN (снимать можно, смотреть архив — нет)
    val onCamera = route == Routes.CAMERA
    val gate = s.pinEnabled && locked && !(s.quickCameraBypass && onCamera)

    Box(Modifier.fillMaxSize().background(Tokens.Bg)) {
        NavHost(navController = nav, startDestination = Routes.HOME) {
            composable(Routes.HOME) { HomeScreen(nav) }
            composable(Routes.CAMERA, arguments = listOf(navArgument("mode") { type = NavType.StringType })) {
                CameraScreen(nav, startVideo = it.arguments?.getString("mode") == "video")
            }
            composable(Routes.GALLERY) { GalleryScreen(nav) }
            composable(Routes.VIEWER, arguments = listOf(navArgument("id") { type = NavType.StringType })) {
                ViewerScreen(nav, it.arguments?.getString("id").orEmpty())
            }
            composable(Routes.TEMPLATES) { TemplatesScreen(nav) }
            composable(Routes.SETTINGS) { SettingsScreen(nav, activity) }
            composable(Routes.PIN_SETUP) { PinSetupScreen(nav) }
        }
        if (gate) LockScreen(activity)
    }
}
