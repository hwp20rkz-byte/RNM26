package com.geostamp.app.ui.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddLocation
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Flip
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Grid3x3
import androidx.compose.material.icons.filled.HighQuality
import androidx.compose.material.icons.filled.Height
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockClock
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Notes
import androidx.compose.material.icons.filled.Password
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.ScreenLockPortrait
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavController
import com.geostamp.app.BuildConfig
import com.geostamp.app.MainActivity
import com.geostamp.app.Routes
import com.geostamp.app.container
import com.geostamp.app.data.AppSettings
import com.geostamp.app.data.PhotoQuality
import com.geostamp.app.data.SyncState
import com.geostamp.app.data.VideoQuality
import com.geostamp.app.drive.DriveAuth
import com.geostamp.app.stamp.CoordFormat
import com.geostamp.app.ui.components.SectionTitle
import com.geostamp.app.ui.components.SettingRow
import com.geostamp.app.ui.components.SwitchRow
import com.geostamp.app.ui.components.TopBar
import com.geostamp.app.ui.lock.biometricAvailable
import com.geostamp.app.ui.theme.Tokens
import com.google.android.gms.auth.api.identity.Identity
import kotlinx.coroutines.launch

private val AUTO_LOCK = listOf(0 to "Сразу", 30 to "30 секунд", 60 to "1 минута", 300 to "5 минут")

@Composable
fun SettingsScreen(nav: NavController, activity: MainActivity) {
    val c = activity.container
    val settings by c.settings.flow.collectAsState(initial = null)
    val s = settings ?: return
    val media by c.media.items.collectAsState()
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var editField by remember { mutableStateOf<String?>(null) }
    var confirmPinOff by remember { mutableStateOf(false) }

    fun set(t: (AppSettings) -> AppSettings) { scope.launch { c.settings.update(t) } }
    fun say(msg: String) { scope.launch { snackbar.showSnackbar(msg) } }

    val authLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { res ->
        val token = runCatching { Identity.getAuthorizationClient(activity).getAuthorizationResultFromIntent(res.data).accessToken }.getOrNull()
        set { it.copy(driveConnected = token != null) }
        say(if (token != null) "Google Диск подключён" else "Доступ к Диску не предоставлен")
    }

    fun connectDrive() = scope.launch {
        try {
            val r = DriveAuth.authorize(activity)
            val pi = r.pendingIntent
            if (r.hasResolution() && pi != null) {
                c.lock.allowShortLeave()
                authLauncher.launch(IntentSenderRequest.Builder(pi.intentSender).build())
            } else {
                c.settings.update { it.copy(driveConnected = r.accessToken != null) }
                say("Google Диск подключён")
            }
        } catch (e: Exception) {
            // Типичная причина — не создан OAuth-клиент Android (пакет + SHA-1) в Google Cloud Console
            say("Не удалось подключить Диск: ${e.message ?: "проверьте OAuth-клиент"}")
        }
    }

    Box(Modifier.fillMaxSize().background(Tokens.Bg)) {
        Column(Modifier.fillMaxSize()) {
            TopBar("Настройки", onBack = { nav.popBackStack() })
            Column(Modifier.verticalScroll(rememberScrollState()).navigationBarsPadding()) {

                SectionTitle("Штамп")
                SettingRow(Icons.Filled.Dashboard, "Шаблон", s.template.title, onClick = { nav.navigate(Routes.TEMPLATES) })
                SwitchRow(Icons.Filled.Place, "Адрес", checked = s.showAddress) { v -> set { it.copy(showAddress = v) } }
                SwitchRow(Icons.Filled.MyLocation, "Координаты", checked = s.showCoords) { v -> set { it.copy(showCoords = v) } }
                SwitchRow(Icons.Filled.Straighten, "Градусы-минуты-секунды", "Вместо десятичных градусов",
                    checked = s.coordFormat == CoordFormat.DMS) { v -> set { it.copy(coordFormat = if (v) CoordFormat.DMS else CoordFormat.DECIMAL) } }
                SwitchRow(Icons.Filled.Height, "Высота и точность GPS", checked = s.showAltitude) { v -> set { it.copy(showAltitude = v) } }
                SwitchRow(Icons.Filled.Work, "Объект / проект", s.project.ifBlank { "не задан" }, checked = s.showProject) { v -> set { it.copy(showProject = v) } }
                SettingRow(Icons.Filled.Edit, "Изменить объект", onClick = { editField = "project" })
                SwitchRow(Icons.Filled.Notes, "Примечание", s.note.ifBlank { "не задано" }, checked = s.showNote) { v -> set { it.copy(showNote = v) } }
                SettingRow(Icons.Filled.Edit, "Изменить примечание", onClick = { editField = "note" })

                Divider()
                SectionTitle("Камера")
                SettingRow(Icons.Filled.HighQuality, "Качество фото", s.photoQuality.title, onClick = {
                    set { it.copy(photoQuality = PhotoQuality.entries[(it.photoQuality.ordinal + 1) % PhotoQuality.entries.size]) }
                })
                SettingRow(Icons.Filled.Videocam, "Качество видео", s.videoQuality.title, onClick = {
                    set { it.copy(videoQuality = VideoQuality.entries[(it.videoQuality.ordinal + 1) % VideoQuality.entries.size]) }
                })
                SwitchRow(Icons.Filled.Schedule, "Живые часы в видео", "Время в штампе идёт вместе с записью", checked = s.liveClockInVideo) { v -> set { it.copy(liveClockInVideo = v) } }
                SwitchRow(Icons.Filled.VolumeUp, "Звук затвора", checked = s.shutterSound) { v -> set { it.copy(shutterSound = v) } }
                SwitchRow(Icons.Filled.Flip, "Зеркалить фронтальную камеру", "Сохранять как в видоискателе", checked = s.mirrorFront) { v -> set { it.copy(mirrorFront = v) } }
                SwitchRow(Icons.Filled.Grid3x3, "Сетка", checked = s.grid) { v -> set { it.copy(grid = v) } }
                SwitchRow(Icons.Filled.PhotoLibrary, "Копировать в галерею телефона", "Иначе снимки видны только в GeoStamp (под PIN)",
                    checked = s.copyToGallery) { v -> set { it.copy(copyToGallery = v) } }

                Divider()
                SectionTitle("Безопасность")
                SwitchRow(Icons.Filled.Password, "PIN-код", if (s.pinEnabled) "Включён (${s.pinLength} цифр)" else "Выключен", checked = s.pinEnabled) { v ->
                    if (v) nav.navigate(Routes.PIN_SETUP) else confirmPinOff = true
                }
                if (s.pinEnabled) {
                    SettingRow(Icons.Filled.Lock, "Сменить PIN", onClick = { nav.navigate(Routes.PIN_SETUP) })
                    if (biometricAvailable(activity)) {
                        SwitchRow(Icons.Filled.Fingerprint, "Отпечаток / лицо", checked = s.biometric) { v -> set { it.copy(biometric = v) } }
                    }
                    SettingRow(Icons.Filled.LockClock, "Автоблокировка", AUTO_LOCK.firstOrNull { it.first == s.autoLockSec }?.second ?: "${s.autoLockSec} с", onClick = {
                        val i = AUTO_LOCK.indexOfFirst { it.first == s.autoLockSec }
                        set { it.copy(autoLockSec = AUTO_LOCK[(i + 1) % AUTO_LOCK.size].first) }
                    })
                    SwitchRow(Icons.Filled.PhotoCamera, "Камера без PIN", "Снимать можно сразу, архив — только после PIN",
                        checked = s.quickCameraBypass) { v -> set { it.copy(quickCameraBypass = v) } }
                }
                SwitchRow(Icons.Filled.ScreenLockPortrait, "Запрет скриншотов", "Скрывает содержимое в списке недавних приложений",
                    checked = s.secureScreen) { v -> set { it.copy(secureScreen = v) } }

                Divider()
                SectionTitle("Google Диск")
                SettingRow(
                    Icons.Filled.Cloud, if (s.driveConnected) "Подключён" else "Подключить Google Диск",
                    if (s.driveConnected) "Папка «GeoStamp» на вашем Диске. Нажмите, чтобы отключить" else "Доступ только к файлам, созданным приложением",
                    onClick = { if (s.driveConnected) set { it.copy(driveConnected = false, autoUpload = false) } else connectDrive() },
                )
                if (s.driveConnected) {
                    SwitchRow(Icons.Filled.CloudSync, "Автозагрузка новых снимков", checked = s.autoUpload) { v -> set { it.copy(autoUpload = v) } }
                    SwitchRow(Icons.Filled.Wifi, "Только по Wi-Fi", checked = s.wifiOnly) { v -> set { it.copy(wifiOnly = v) } }
                    SwitchRow(Icons.Filled.Folder, "Папки по объектам", "GeoStamp / Объект / Дата", checked = s.driveByProject) { v -> set { it.copy(driveByProject = v) } }
                    val pending = media.filter { it.sync != SyncState.DONE }
                    SettingRow(Icons.Filled.CloudUpload, "Загрузить всё незагруженное", "${pending.size} файлов", onClick = {
                        scope.launch {
                            pending.forEach { item -> c.media.update(item.id) { it.copy(sync = SyncState.QUEUED) } }
                            c.drive.enqueue(pending.map { it.id }, s.wifiOnly)
                            snackbar.showSnackbar("В очереди: ${pending.size}")
                        }
                    })
                }

                Divider()
                SectionTitle("О приложении")
                SettingRow(Icons.Filled.AddLocation, "Быстрый запуск", "Плитка «GPS-камера» в шторке и ярлыки при долгом нажатии на иконку")
                SettingRow(Icons.Filled.Info, "GeoStamp ${BuildConfig.VERSION_NAME}", "Снимки хранятся приватно, проверка подлинности по SHA-256")
                Spacer(Modifier.height(androidx.compose.ui.unit.Dp(32f)))
            }
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(androidx.compose.ui.unit.Dp(16f)))
    }

    editField?.let { field ->
        var value by remember(field) { mutableStateOf(if (field == "project") s.project else s.note) }
        AlertDialog(
            onDismissRequest = { editField = null },
            title = { Text(if (field == "project") "Объект / проект" else "Примечание") },
            text = { OutlinedTextField(value, { value = it.take(if (field == "project") 80 else 140) }, singleLine = field == "project") },
            confirmButton = {
                TextButton(onClick = {
                    val v = value.trim()
                    set { if (field == "project") it.copy(project = v, showProject = v.isNotBlank()) else it.copy(note = v, showNote = v.isNotBlank()) }
                    editField = null
                }) { Text("Сохранить") }
            },
            dismissButton = { TextButton(onClick = { editField = null }) { Text("Отмена") } },
        )
    }

    if (confirmPinOff) AlertDialog(
        onDismissRequest = { confirmPinOff = false },
        title = { Text("Отключить PIN?") },
        text = { Text("Архив снимков станет доступен любому, кто откроет приложение.") },
        confirmButton = { TextButton(onClick = { scope.launch { c.pin.disable() }; confirmPinOff = false }) { Text("Отключить", color = Tokens.Error) } },
        dismissButton = { TextButton(onClick = { confirmPinOff = false }) { Text("Отмена") } },
    )
}

@Composable
private fun Divider() = HorizontalDivider(color = Tokens.Outline)
