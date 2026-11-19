package com.geostamp.app.ui.home

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.geostamp.app.Routes
import com.geostamp.app.container
import com.geostamp.app.location.GeoFix
import com.geostamp.app.stamp.StampFormat
import com.geostamp.app.ui.components.Card
import com.geostamp.app.ui.components.GpsDot
import com.geostamp.app.ui.components.SectionTitle
import com.geostamp.app.ui.components.TopBar
import com.geostamp.app.ui.theme.Space
import com.geostamp.app.ui.theme.Tokens
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(nav: NavController) {
    val ctx = LocalContext.current
    val c = ctx.container
    val settings by c.settings.flow.collectAsState(initial = null)
    val fix by c.location.state.collectAsState()
    val items by c.media.items.collectAsState()
    val scope = rememberCoroutineScope()

    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { c.location.refresh() }

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { c.location.refresh() }
    val gpsLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { c.location.refresh() }

    fun enableGps() {
        if (!fix.permission) {
            permLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            return
        }
        scope.launch {
            val e = c.location.checkGpsSettings()
            if (e != null) {
                c.lock.allowShortLeave()
                gpsLauncher.launch(IntentSenderRequest.Builder(e.resolution).build())
            } else c.location.refresh()
        }
    }

    Column(Modifier.fillMaxSize().background(Tokens.Bg).navigationBarsPadding()) {
        TopBar("GeoStamp", onBack = null) {
            if (settings?.pinEnabled == true) IconButton(onClick = { c.lock.lockNow() }) { Icon(Icons.Filled.Lock, "Заблокировать") }
            IconButton(onClick = { nav.navigate(Routes.SETTINGS) }) { Icon(Icons.Filled.Settings, "Настройки") }
        }
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = Space.s2)) {
            GpsCard(fix, onEnable = ::enableGps)
            Spacer(Modifier.height(Space.s2))
            Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                BigAction("Фото", Icons.Filled.PhotoCamera, Tokens.Primary, Modifier.weight(1f)) { nav.navigate(Routes.camera(false)) }
                BigAction("Видео", Icons.Filled.Videocam, Tokens.Accent, Modifier.weight(1f)) { nav.navigate(Routes.camera(true)) }
            }
            Spacer(Modifier.height(Space.s2))
            Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                SmallAction("Шаблон", settings?.template?.title ?: "", Icons.Filled.Dashboard, Modifier.weight(1f)) { nav.navigate(Routes.TEMPLATES) }
                SmallAction("Галерея", "${items.size} файлов", Icons.Filled.PhotoLibrary, Modifier.weight(1f)) { nav.navigate(Routes.GALLERY) }
            }
            Spacer(Modifier.height(Space.s2))
            val driveOn = settings?.driveConnected == true
            SmallAction(
                "Google Диск",
                when {
                    !driveOn -> "Не подключён — нажмите, чтобы настроить"
                    settings?.autoUpload == true -> "Автозагрузка" + if (settings?.wifiOnly == true) " по Wi-Fi" else ""
                    else -> "Подключён, загрузка вручную"
                },
                if (driveOn) Icons.Filled.CloudDone else Icons.Filled.CloudOff, Modifier.fillMaxWidth(),
            ) { nav.navigate(Routes.SETTINGS) }

            if (items.isNotEmpty()) {
                SectionTitle("Последние")
                LazyRow(horizontalArrangement = Arrangement.spacedBy(Space.s1)) {
                    items(items.take(12), key = { it.id }) { item ->
                        AsyncImage(
                            model = c.media.file(item), contentDescription = null, contentScale = ContentScale.Crop,
                            modifier = Modifier.size(Space.s8 + Space.s4).clip(RoundedCornerShape(Space.s1)).background(Tokens.Surface)
                                .clickable { nav.navigate(Routes.viewer(item.id)) },
                        )
                    }
                }
            }
            Spacer(Modifier.height(Space.s4))
        }
    }
}

@Composable
private fun GpsCard(fix: GeoFix, onEnable: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(Space.s2)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s1)) {
                GpsDot(fix)
                Text(
                    when {
                        !fix.permission -> "Нет доступа к геолокации"
                        !fix.gpsEnabled -> "GPS выключен"
                        fix.isGood -> "GPS: точная позиция"
                        fix.location != null -> "GPS: уточняем…"
                        else -> "GPS: поиск спутников…"
                    },
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(Modifier.weight(1f))
                fix.location?.let { Text(StampFormat.accuracy(it.accuracy), style = MaterialTheme.typography.labelSmall, color = Tokens.TextMuted) }
            }
            val loc = fix.location
            if (loc != null) {
                Spacer(Modifier.height(Space.s1))
                Text(fix.address?.full ?: "Адрес определяется…", style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(
                    StampFormat.coords(loc.latitude, loc.longitude, com.geostamp.app.stamp.CoordFormat.DECIMAL),
                    style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted,
                )
            }
            if (!fix.permission || !fix.gpsEnabled) {
                Spacer(Modifier.height(Space.s2))
                Button(
                    onClick = onEnable, modifier = Modifier.fillMaxWidth().height(Space.s6),
                    colors = ButtonDefaults.buttonColors(containerColor = Tokens.Accent, contentColor = Tokens.OnPrimary),
                ) {
                    Icon(Icons.Filled.GpsFixed, null)
                    Spacer(Modifier.size(Space.s1))
                    Text(if (!fix.permission) "Разрешить геолокацию" else "Включить GPS")
                }
            }
        }
    }
}

@Composable
private fun BigAction(title: String, icon: ImageVector, color: Color, modifier: Modifier, onClick: () -> Unit) {
    Card(modifier.aspectRatio(1f), onClick = onClick, color = color) {
        Box(Modifier.fillMaxSize().padding(Space.s2)) {
            Text(title, style = MaterialTheme.typography.titleLarge, color = Tokens.OnPrimary, modifier = Modifier.align(Alignment.TopStart))
            Icon(icon, null, tint = Tokens.OnPrimary, modifier = Modifier.size(Space.s6).align(Alignment.BottomEnd))
        }
    }
}

@Composable
private fun SmallAction(title: String, subtitle: String, icon: ImageVector, modifier: Modifier, onClick: () -> Unit) {
    Card(modifier, onClick = onClick) {
        Row(Modifier.padding(Space.s2), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
            Icon(icon, null, tint = Tokens.Primary)
            Column {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}
