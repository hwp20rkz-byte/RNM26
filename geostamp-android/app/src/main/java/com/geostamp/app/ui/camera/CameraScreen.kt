package com.geostamp.app.ui.camera

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.media.MediaActionSound
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recording
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.CameraController
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.camera.view.video.AudioConfig
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Cameraswitch
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.FlashAuto
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Grid3x3
import androidx.compose.material.icons.filled.GridOff
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.geostamp.app.Routes
import com.geostamp.app.container
import com.geostamp.app.data.VideoQuality
import com.geostamp.app.stamp.StampData
import com.geostamp.app.ui.components.GpsDot
import com.geostamp.app.ui.components.StampPreview
import com.geostamp.app.ui.theme.Space
import com.geostamp.app.ui.theme.Tokens
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

private enum class Flash(val mode: Int) {
    OFF(ImageCapture.FLASH_MODE_OFF), AUTO(ImageCapture.FLASH_MODE_AUTO), ON(ImageCapture.FLASH_MODE_ON);
    fun next() = entries[(ordinal + 1) % entries.size]
}

@SuppressLint("MissingPermission")
@Composable
fun CameraScreen(nav: NavController, startVideo: Boolean) {
    val ctx = LocalContext.current
    val c = ctx.container
    val settingsState by c.settings.flow.collectAsState(initial = null)
    val s = settingsState ?: return
    val fix by c.location.state.collectAsState()
    val items by c.media.items.collectAsState()
    val owner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val executor = remember { ContextCompat.getMainExecutor(ctx) }
    val sound = remember { MediaActionSound() }
    DisposableEffect(Unit) { onDispose { sound.release() } }

    var video by rememberSaveable { mutableStateOf(startVideo) }
    var front by rememberSaveable { mutableStateOf(false) }
    var flash by rememberSaveable { mutableStateOf(Flash.OFF) }
    var recording by remember { mutableStateOf<Recording?>(null) }
    var recStartedAt by remember { mutableLongStateOf(0L) }
    var processing by remember { mutableIntStateOf(0) }
    var message by remember { mutableStateOf<String?>(null) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var editNote by remember { mutableStateOf(false) }
    val shutterFlash = remember { Animatable(0f) }

    fun granted(p: String) = ContextCompat.checkSelfPermission(ctx, p) == PackageManager.PERMISSION_GRANTED
    var camGranted by remember { mutableStateOf(granted(Manifest.permission.CAMERA)) }

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        camGranted = granted(Manifest.permission.CAMERA)
        c.location.refresh()
    }
    val gpsLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { c.location.refresh() }

    fun enableGps() = scope.launch {
        val e = c.location.checkGpsSettings()
        if (e != null) { c.lock.allowShortLeave(); gpsLauncher.launch(IntentSenderRequest.Builder(e.resolution).build()) }
        else c.location.refresh()
    }

    // Быстрый запуск: сразу запрашиваем всё нужное и, если GPS выключен, — системный диалог включения
    LaunchedEffect(Unit) {
        val need = listOf(Manifest.permission.CAMERA, Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.RECORD_AUDIO).filterNot(::granted)
        if (need.isNotEmpty()) permLauncher.launch(need.toTypedArray())
        else if (!c.location.isGpsEnabled()) enableGps()
    }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { c.location.refresh() }
    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(1000L - now % 1000L) } }
    LaunchedEffect(message) { if (message != null) { delay(2500); message = null } }

    val controller = remember { LifecycleCameraController(ctx) }
    DisposableEffect(owner) {
        controller.bindToLifecycle(owner)
        onDispose { controller.unbind() }
    }
    LaunchedEffect(video, front, s.videoQuality, camGranted) {
        if (!camGranted) return@LaunchedEffect
        val ratio = if (video) AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY else AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY
        val selector = ResolutionSelector.Builder().setAspectRatioStrategy(ratio).build()
        controller.previewResolutionSelector = selector
        controller.imageCaptureResolutionSelector = selector
        controller.imageCaptureMode = ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY
        val q = when (s.videoQuality) {
            VideoQuality.SD -> Quality.SD; VideoQuality.HD -> Quality.HD
            VideoQuality.FHD -> Quality.FHD; VideoQuality.UHD -> Quality.UHD
        }
        controller.videoCaptureQualitySelector = QualitySelector.from(q, FallbackStrategy.lowerQualityOrHigherThan(Quality.SD))
        controller.setEnabledUseCases(if (video) CameraController.VIDEO_CAPTURE else CameraController.IMAGE_CAPTURE)
        val sel = if (front) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
        // hasCamera() бросает исключение до инициализации — просто пробуем, при неудаче остаётся прежняя камера
        runCatching { controller.cameraSelector = sel }
    }
    LaunchedEffect(flash, video) {
        if (video) controller.enableTorch(flash == Flash.ON)
        else { controller.enableTorch(false); controller.imageCaptureFlashMode = flash.mode }
    }

    fun buildStamp(): StampData {
        val l = fix.location
        return StampData(
            timeMillis = System.currentTimeMillis(),
            latitude = l?.latitude, longitude = l?.longitude,
            altitude = l?.takeIf { it.hasAltitude() }?.altitude, accuracy = l?.accuracy,
            address = fix.address?.full, locality = fix.address?.locality,
            project = s.project.takeIf { it.isNotBlank() }, note = s.note.takeIf { it.isNotBlank() },
            weather = fix.weather?.text(),
            mockLocation = fix.isMock,
        )
    }

    fun takePhoto() {
        if (processing > 0) return
        val stamp = buildStamp()
        val mirror = front && s.mirrorFront
        if (s.shutterSound) sound.play(MediaActionSound.SHUTTER_CLICK)
        scope.launch { shutterFlash.snapTo(0.7f); shutterFlash.animateTo(0f, tween(160)) }
        processing++
        controller.takePicture(executor, object : ImageCapture.OnImageCapturedCallback() {
            override fun onCaptureSuccess(image: ImageProxy) {
                val bmp = image.toBitmap()
                val rot = image.imageInfo.rotationDegrees
                image.close()
                // Обработка в scope приложения: не прервётся, если пользователь уйдёт с экрана
                c.scope.launch {
                    runCatching { c.processor.processPhoto(bmp, rot, mirror, stamp, s) }
                        .onFailure { message = "Не удалось сохранить фото" }
                    processing--
                }
            }
            override fun onError(exception: ImageCaptureException) {
                processing--
                message = "Ошибка камеры: ${exception.imageCaptureError}"
            }
        })
    }

    fun toggleRecording() {
        recording?.let { it.stop(); return }
        val raw = File(ctx.cacheDir, "rec_${System.currentTimeMillis()}.mp4")
        val stamp = buildStamp()
        val audio = AudioConfig.create(granted(Manifest.permission.RECORD_AUDIO))
        if (s.shutterSound) sound.play(MediaActionSound.START_VIDEO_RECORDING)
        recording = controller.startRecording(FileOutputOptions.Builder(raw).build(), audio, executor) { ev ->
            when (ev) {
                is VideoRecordEvent.Start -> recStartedAt = System.currentTimeMillis()
                is VideoRecordEvent.Finalize -> {
                    recording = null
                    if (s.shutterSound) sound.play(MediaActionSound.STOP_VIDEO_RECORDING)
                    if (raw.exists() && raw.length() > 0) {
                        processing++
                        c.scope.launch {
                            runCatching { c.processor.processVideo(raw, stamp, s) }
                                .onFailure { message = "Не удалось обработать видео"; raw.delete() }
                            processing--
                        }
                    } else message = "Запись не сохранена (код ${ev.error})"
                }
            }
        }
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        Column(Modifier.fillMaxSize()) {
            // ---- Верхняя панель
            Row(
                Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = Space.s1),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Назад", tint = Color.White) }
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { flash = flash.next() }) {
                    Icon(
                        when (flash) { Flash.OFF -> Icons.Filled.FlashOff; Flash.AUTO -> Icons.Filled.FlashAuto; Flash.ON -> Icons.Filled.FlashOn },
                        "Вспышка", tint = if (flash == Flash.OFF) Color.White else Tokens.Primary,
                    )
                }
                IconButton(onClick = { scope.launch { c.settings.update { it.copy(grid = !it.grid) } } }) {
                    Icon(if (s.grid) Icons.Filled.Grid3x3 else Icons.Filled.GridOff, "Сетка", tint = Color.White)
                }
                IconButton(onClick = { editNote = true }) { Icon(Icons.Filled.EditNote, "Объект и примечание", tint = Color.White) }
                IconButton(onClick = { nav.navigate(Routes.TEMPLATES) }, enabled = recording == null) {
                    Icon(Icons.Filled.Dashboard, "Шаблон", tint = Color.White)
                }
            }

            // ---- Видоискатель: соотношение сторон = соотношению итогового файла (WYSIWYG)
            Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                Box(Modifier.fillMaxWidth().aspectRatio(if (video) 9f / 16f else 3f / 4f, matchHeightConstraintsFirst = true)) {
                    if (camGranted) {
                        AndroidView(
                            factory = { context ->
                                PreviewView(context).apply {
                                    scaleType = PreviewView.ScaleType.FILL_CENTER
                                    this.controller = controller
                                }
                            },
                            modifier = Modifier.fillMaxSize(),
                        )
                    } else {
                        Text("Нужен доступ к камере", color = Color.White, modifier = Modifier.align(Alignment.Center))
                    }
                    if (s.grid) GridOverlay(Modifier.fillMaxSize())
                    val stamp = buildStamp().copy(timeMillis = now)
                    StampPreview(stamp, s.template, s.stampOptions, Modifier.fillMaxSize())
                    Box(Modifier.fillMaxSize().background(Color.White.copy(alpha = shutterFlash.value)))

                    // GPS-индикатор и быстрый запуск GPS
                    Row(
                        Modifier.align(Alignment.TopStart).padding(Space.s1)
                            .clip(RoundedCornerShape(Space.s2)).background(Tokens.Scrim)
                            .clickable(enabled = !fix.gpsEnabled || !fix.permission) {
                                if (!fix.permission) permLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                                else enableGps()
                            }
                            .padding(horizontal = Space.s1 + Space.s1 / 2, vertical = Space.s1 / 2),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Space.s1),
                    ) {
                        GpsDot(fix)
                        Text(
                            when {
                                !fix.permission -> "Разрешить GPS"
                                !fix.gpsEnabled -> "Включить GPS"
                                fix.location == null -> "Поиск GPS…"
                                fix.isMock -> "GPS подменён!"
                                else -> "±${Math.round(fix.location!!.accuracy)} м" +
                                    (fix.weather?.let { "  ·  " + it.text().substringBefore(",") } ?: "")
                            },
                            color = if (fix.isMock) Tokens.Error else Color.White, style = MaterialTheme.typography.labelSmall,
                        )
                    }

                    if (recording != null) {
                        val sec = ((now - recStartedAt).coerceAtLeast(0) / 1000)
                        Row(
                            Modifier.align(Alignment.TopEnd).padding(Space.s1).clip(RoundedCornerShape(Space.s2))
                                .background(Tokens.Scrim).padding(horizontal = Space.s1 + Space.s1 / 2, vertical = Space.s1 / 2),
                            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s1),
                        ) {
                            Box(Modifier.size(Space.s1 + Space.s1 / 4).clip(CircleShape).background(Tokens.Recording))
                            Text("%02d:%02d".format(sec / 60, sec % 60), color = Color.White, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
                message?.let {
                    Text(
                        it, color = Color.White, style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.align(Alignment.BottomCenter).padding(Space.s2)
                            .clip(RoundedCornerShape(Space.s1)).background(Tokens.Scrim).padding(Space.s1),
                    )
                }
            }

            // ---- Нижняя панель
            Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(vertical = Space.s2), horizontalAlignment = Alignment.CenterHorizontally) {
                Row(horizontalArrangement = Arrangement.spacedBy(Space.s3)) {
                    ModeLabel("ФОТО", !video, enabled = recording == null) { video = false }
                    ModeLabel("ВИДЕО", video, enabled = recording == null) { video = true }
                }
                Spacer(Modifier.height(Space.s2))
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = Space.s4),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Box(
                        Modifier.size(Space.s6 + Space.s1).clip(RoundedCornerShape(Space.s1)).background(Tokens.Surface)
                            .clickable(enabled = recording == null) { nav.navigate(Routes.GALLERY) },
                        contentAlignment = Alignment.Center,
                    ) {
                        val last = items.firstOrNull()
                        if (last != null) AsyncImage(c.media.file(last), "Галерея", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                        else Icon(Icons.Filled.PhotoLibrary, "Галерея", tint = Tokens.TextMuted)
                        if (processing > 0) CircularProgressIndicator(Modifier.size(Space.s3), color = Tokens.Primary, strokeWidth = 2.dp)
                    }
                    Shutter(video = video, recording = recording != null, enabled = camGranted && (video || processing == 0)) {
                        if (video) toggleRecording() else takePhoto()
                    }
                    IconButton(
                        onClick = { front = !front }, enabled = recording == null,
                        modifier = Modifier.size(Space.s6 + Space.s1).clip(CircleShape).background(Tokens.Surface),
                    ) { Icon(Icons.Filled.Cameraswitch, "Сменить камеру", tint = Color.White) }
                }
            }
        }
    }

    if (editNote) NoteDialog(s.project, s.note, onDismiss = { editNote = false }) { p, n ->
        scope.launch { c.settings.update { it.copy(project = p, note = n, showProject = it.showProject || p.isNotBlank(), showNote = it.showNote || n.isNotBlank()) } }
        editNote = false
    }
}

@Composable
private fun ModeLabel(text: String, selected: Boolean, enabled: Boolean, onClick: () -> Unit) {
    Text(
        text,
        color = if (selected) Tokens.Primary else Color.White.copy(alpha = 0.7f),
        style = MaterialTheme.typography.labelLarge.copy(fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium),
        modifier = Modifier.clip(RoundedCornerShape(Space.s2)).clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = Space.s2, vertical = Space.s1),
    )
}

@Composable
private fun Shutter(video: Boolean, recording: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val ring = Space.s8 + Space.s2
    Box(
        Modifier.size(ring).clip(CircleShape).border(4.dp, Color.White, CircleShape)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        val inner = when {
            recording -> Modifier.size(Space.s3 + Space.s1).clip(RoundedCornerShape(Space.s1)).background(Tokens.Recording)
            video -> Modifier.size(ring - Space.s2).clip(CircleShape).background(Tokens.Recording)
            else -> Modifier.size(ring - Space.s2).clip(CircleShape).background(if (enabled) Color.White else Color.White.copy(alpha = 0.4f))
        }
        Box(inner)
    }
}

@Composable
private fun GridOverlay(modifier: Modifier) {
    Canvas(modifier) {
        val c = Color.White.copy(alpha = 0.35f)
        for (i in 1..2) {
            val x = size.width * i / 3f
            val y = size.height * i / 3f
            drawLine(c, Offset(x, 0f), Offset(x, size.height), strokeWidth = 1.dp.toPx())
            drawLine(c, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
        }
    }
}

@Composable
private fun NoteDialog(project: String, note: String, onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var p by remember { mutableStateOf(project) }
    var n by remember { mutableStateOf(note) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Объект и примечание") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Space.s2)) {
                OutlinedTextField(p, { p = it.take(80) }, label = { Text("Объект / проект") }, singleLine = true)
                OutlinedTextField(n, { n = it.take(140) }, label = { Text("Примечание") }, maxLines = 3)
                Text("Попадает в штамп, подпись WhatsApp и папку на Google Диске.", style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
            }
        },
        confirmButton = { TextButton(onClick = { onSave(p.trim(), n.trim()) }) { Text("Сохранить") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Отмена") } },
    )
}
