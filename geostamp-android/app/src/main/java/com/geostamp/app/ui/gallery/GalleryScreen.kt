package com.geostamp.app.ui.gallery

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudQueue
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.SelectAll
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SyncProblem
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextAlign
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.geostamp.app.R
import com.geostamp.app.Routes
import com.geostamp.app.container
import com.geostamp.app.data.MediaItem
import com.geostamp.app.data.MediaType
import com.geostamp.app.data.SyncState
import com.geostamp.app.drive.toStamp
import com.geostamp.app.report.PdfReport
import com.geostamp.app.share.ShareHelper
import com.geostamp.app.stamp.CoordFormat
import com.geostamp.app.stamp.StampFormat
import com.geostamp.app.ui.components.TopBar
import com.geostamp.app.ui.theme.Space
import com.geostamp.app.ui.theme.Tokens
import kotlinx.coroutines.launch

private enum class Filter(val title: String) { ALL("Все"), PHOTO("Фото"), VIDEO("Видео"), NOT_SYNCED("Не в облаке") }

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun GalleryScreen(nav: NavController) {
    val ctx = LocalContext.current
    val c = ctx.container
    val all by c.media.items.collectAsState()
    val settings by c.settings.flow.collectAsState(initial = null)
    val scope = rememberCoroutineScope()
    var filter by remember { mutableStateOf(Filter.ALL) }
    var selected by remember { mutableStateOf(setOf<String>()) }
    var confirmDelete by remember { mutableStateOf(false) }
    var buildingPdf by remember { mutableStateOf(false) }

    val items = when (filter) {
        Filter.ALL -> all
        Filter.PHOTO -> all.filter { it.type == MediaType.PHOTO }
        Filter.VIDEO -> all.filter { it.type == MediaType.VIDEO }
        Filter.NOT_SYNCED -> all.filter { it.sync != SyncState.DONE }
    }
    val selection = all.filter { it.id in selected }
    val selecting = selected.isNotEmpty()

    fun share(whatsApp: Boolean) {
        val caption = if (selection.size == 1) StampFormat.caption(selection[0].toStamp(), settings?.coordFormat ?: CoordFormat.DECIMAL) else null
        c.lock.allowShortLeave()
        ShareHelper.share(ctx, c.media, selection, caption, whatsApp)
    }

    fun pdfReport() {
        if (buildingPdf) return
        buildingPdf = true
        scope.launch {
            val file = runCatching { PdfReport.build(ctx, c.media, selection) }.getOrNull()
            buildingPdf = false
            if (file != null) {
                c.lock.allowShortLeave()
                ShareHelper.shareFile(ctx, file, "application/pdf", file.nameWithoutExtension)
                selected = emptySet()
            }
        }
    }

    fun upload() {
        val s = settings ?: return
        if (!s.driveConnected) {
            // Диск не подключён через OAuth — отдаём файлы приложению «Google Диск»
            c.lock.allowShortLeave()
            ShareHelper.sendToDriveApp(ctx, c.media, selection)
            selected = emptySet()
            return
        }
        scope.launch {
            selection.forEach { item -> c.media.update(item.id) { it.copy(sync = SyncState.QUEUED) } }
            c.drive.enqueue(selection.map { it.id }, s.wifiOnly)
            selected = emptySet()
        }
    }

    Column(Modifier.fillMaxSize().background(Tokens.Bg)) {
        if (selecting) {
            TopBar("Выбрано: ${selected.size}", onBack = { selected = emptySet() }) {
                IconButton(onClick = { selected = items.map { it.id }.toSet() }) { Icon(Icons.Filled.SelectAll, "Выбрать все") }
            }
        } else {
            TopBar("Галерея", onBack = { nav.popBackStack() })
        }
        Row(Modifier.padding(horizontal = Space.s2), horizontalArrangement = Arrangement.spacedBy(Space.s1)) {
            Filter.entries.forEach { f -> FilterChip(selected = filter == f, onClick = { filter = f }, label = { Text(f.title) }) }
        }
        Spacer(Modifier.height(Space.s1))
        if (items.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Пока пусто. Снимки хранятся приватно — только в этом приложении.", color = Tokens.TextMuted,
                    style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(Space.s4))
            }
            return@Column
        }
        LazyVerticalGrid(
            columns = GridCells.Adaptive(112.dp),
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(Space.s1),
            horizontalArrangement = Arrangement.spacedBy(Space.s1 / 2),
            verticalArrangement = Arrangement.spacedBy(Space.s1 / 2),
        ) {
            items(items, key = { it.id }) { item ->
                val isSel = item.id in selected
                Box(
                    Modifier.aspectRatio(1f).clip(RoundedCornerShape(Space.s1)).background(Tokens.Surface)
                        .then(if (isSel) Modifier.border(3.dp, Tokens.Primary, RoundedCornerShape(Space.s1)) else Modifier)
                        .combinedClickable(
                            onClick = {
                                if (selecting) selected = if (isSel) selected - item.id else selected + item.id
                                else nav.navigate(Routes.viewer(item.id))
                            },
                            onLongClick = { selected = selected + item.id },
                        ),
                ) {
                    AsyncImage(c.media.file(item), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    if (item.type == MediaType.VIDEO) Icon(Icons.Filled.PlayCircle, "Видео", tint = Color.White, modifier = Modifier.align(Alignment.Center))
                    SyncBadge(item.sync, Modifier.align(Alignment.BottomEnd).padding(Space.s1 / 2))
                    if (isSel) Icon(Icons.Filled.CheckCircle, null, tint = Tokens.Primary, modifier = Modifier.align(Alignment.TopEnd).padding(Space.s1 / 2))
                }
            }
        }
        if (selecting) {
            ActionBar {
                ActionButton("WhatsApp", painter = R.drawable.ic_whatsapp, modifier = Modifier.weight(1f)) { share(true) }
                ActionButton("Отправить", Icons.Filled.Share, modifier = Modifier.weight(1f)) { share(false) }
                ActionButton("На Диск", Icons.Filled.CloudUpload, modifier = Modifier.weight(1f)) { upload() }
                ActionButton("PDF", Icons.Filled.PictureAsPdf, modifier = Modifier.weight(1f)) { pdfReport() }
                ActionButton("Удалить", Icons.Filled.Delete, modifier = Modifier.weight(1f)) { confirmDelete = true }
            }
        }
    }

    if (confirmDelete) ConfirmDelete(selected.size, onDismiss = { confirmDelete = false }) {
        scope.launch { c.media.delete(selected); selected = emptySet(); confirmDelete = false }
    }
    if (buildingPdf) AlertDialog(
        onDismissRequest = {},
        confirmButton = {},
        title = { Text("Формирую PDF-отчёт…") },
        text = { androidx.compose.material3.LinearProgressIndicator(color = Tokens.Primary, modifier = Modifier.fillMaxWidth()) },
    )
}

@Composable
private fun SyncBadge(state: SyncState, modifier: Modifier) {
    val (icon, tint) = when (state) {
        SyncState.DONE -> Icons.Filled.CloudDone to Tokens.Success
        SyncState.QUEUED, SyncState.UPLOADING -> Icons.Filled.CloudQueue to Tokens.Accent
        SyncState.FAILED, SyncState.NEEDS_AUTH -> Icons.Filled.SyncProblem to Tokens.Error
        SyncState.NONE -> return
    }
    Box(modifier.size(Space.s3).clip(CircleShape).background(Tokens.Scrim), contentAlignment = Alignment.Center) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(Space.s2))
    }
}

@Composable
private fun ActionButton(
    label: String, icon: ImageVector? = null, painter: Int? = null,
    modifier: Modifier = Modifier, onClick: () -> Unit,
) {
    Column(
        modifier.clip(RoundedCornerShape(Space.s1)).clickable(onClick = onClick).padding(vertical = Space.s1),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (painter != null) Icon(painterResource(painter), null, tint = Tokens.Primary)
        else if (icon != null) Icon(icon, null, tint = Tokens.Primary)
        Spacer(Modifier.height(Space.s1 / 2))
        Text(
            label, style = MaterialTheme.typography.labelSmall, color = Tokens.Primary,
            maxLines = 1, softWrap = false, textAlign = TextAlign.Center,
        )
    }
}

/** Нижняя панель действий: фиксирована над навигационной панелью, кнопки делят ширину поровну. */
@Composable
private fun ActionBar(content: @Composable RowScope.() -> Unit) {
    Row(
        Modifier.fillMaxWidth().background(Tokens.SurfaceHigh).navigationBarsPadding()
            .padding(horizontal = Space.s1, vertical = Space.s1),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

@Composable
private fun ConfirmDelete(count: Int, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Удалить $count шт.?") },
        text = { Text("Файлы будут удалены с телефона. Копии на Google Диске останутся.") },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Удалить", color = Tokens.Error) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Отмена") } },
    )
}

@Composable
fun ViewerScreen(nav: NavController, id: String) {
    val ctx = LocalContext.current
    val c = ctx.container
    val all by c.media.items.collectAsState()
    val settings by c.settings.flow.collectAsState(initial = null)
    val item = all.firstOrNull { it.id == id }
    val scope = rememberCoroutineScope()
    var confirmDelete by remember { mutableStateOf(false) }
    var verify by remember { mutableStateOf<Boolean?>(null) }

    if (item == null) { Box(Modifier.fillMaxSize().background(Tokens.Bg)); return }

    Column(Modifier.fillMaxSize().background(Tokens.Bg)) {
        TopBar(StampFormat.date(item.createdAt) + "  " + StampFormat.time(item.createdAt), onBack = { nav.popBackStack() }) {
            IconButton(onClick = { confirmDelete = true }) { Icon(Icons.Filled.Delete, "Удалить") }
        }
        Box(Modifier.fillMaxWidth().weight(1f).background(Color.Black), contentAlignment = Alignment.Center) {
            if (item.type == MediaType.PHOTO) ZoomableImage(c.media.file(item))
            else {
                AsyncImage(c.media.file(item), null, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize())
                IconButton(onClick = { c.lock.allowShortLeave(); ShareHelper.playVideo(ctx, c.media, item) }, modifier = Modifier.size(Space.s8)) {
                    Icon(Icons.Filled.PlayCircle, "Воспроизвести", tint = Color.White, modifier = Modifier.size(Space.s8))
                }
            }
        }
        Column(
            Modifier.fillMaxWidth().heightIn(max = 168.dp).background(Tokens.Surface)
                .verticalScroll(rememberScrollState()).padding(Space.s2),
        ) { InfoBlock(item, verify) }
        ActionBar {
            val w = Modifier.weight(1f)
            ActionButton("WhatsApp", painter = R.drawable.ic_whatsapp, modifier = w) {
                c.lock.allowShortLeave()
                ShareHelper.share(ctx, c.media, listOf(item), StampFormat.caption(item.toStamp(), settings?.coordFormat ?: CoordFormat.DECIMAL), true)
            }
            ActionButton("Отправить", Icons.Filled.Share, modifier = w) {
                c.lock.allowShortLeave()
                ShareHelper.share(ctx, c.media, listOf(item), StampFormat.caption(item.toStamp()), false)
            }
            ActionButton("На Диск", Icons.Filled.CloudUpload, modifier = w) {
                val s = settings ?: return@ActionButton
                if (!s.driveConnected) { c.lock.allowShortLeave(); ShareHelper.sendToDriveApp(ctx, c.media, listOf(item)) }
                else scope.launch { c.media.update(item.id) { it.copy(sync = SyncState.QUEUED) }; c.drive.enqueue(listOf(item.id), s.wifiOnly) }
            }
            if (item.latitude != null && item.longitude != null) ActionButton("Карта", Icons.Filled.Map, modifier = w) {
                c.lock.allowShortLeave(); ShareHelper.openInMaps(ctx, item.latitude, item.longitude)
            }
            ActionButton("Проверить", Icons.Filled.Verified, modifier = w) {
                scope.launch {
                    verify = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                        com.geostamp.app.data.MediaRepository.sha256(c.media.file(item)) == item.sha256
                    }
                }
            }
        }
    }

    if (confirmDelete) ConfirmDelete(1, onDismiss = { confirmDelete = false }) {
        scope.launch { c.media.delete(setOf(item.id)); confirmDelete = false; nav.popBackStack() }
    }
}

@Composable
private fun InfoBlock(item: MediaItem, verify: Boolean?) {
    val muted = MaterialTheme.typography.bodySmall
    Text(item.address ?: "Адрес не определён", style = MaterialTheme.typography.bodyMedium)
    if (item.latitude != null && item.longitude != null) {
        Text(StampFormat.coords(item.latitude, item.longitude, CoordFormat.DECIMAL), style = muted, color = Tokens.TextMuted)
    }
    item.project?.let { Text("Объект: $it", style = muted, color = Tokens.TextMuted) }
    item.note?.let { Text("Примечание: $it", style = muted, color = Tokens.TextMuted) }
    item.weather?.let { Text("Погода: $it", style = muted, color = Tokens.TextMuted) }
    if (item.mockLocation) Text("⚠ Координаты подменены программой при съёмке", style = muted, color = Tokens.Error)
    Text(
        "Облако: " + when (item.sync) {
            SyncState.NONE -> "не загружено"; SyncState.QUEUED -> "в очереди"; SyncState.UPLOADING -> "загружается…"
            SyncState.DONE -> "загружено"; SyncState.FAILED -> "ошибка, повторите"; SyncState.NEEDS_AUTH -> "нужно войти в Google заново"
        },
        style = muted, color = Tokens.TextMuted,
    )
    SelectionContainer { Text("SHA-256: ${item.sha256}", style = muted, color = Tokens.TextMuted) }
    when (verify) {
        true -> Text("✓ Файл не изменялся с момента съёмки", style = muted, color = Tokens.Success)
        false -> Text("✗ Файл изменён после съёмки", style = muted, color = Tokens.Error)
        null -> {}
    }
}

@Composable
private fun ZoomableImage(model: Any) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    AsyncImage(
        model, null, contentScale = ContentScale.Fit,
        modifier = Modifier.fillMaxSize()
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scale = (scale * zoom).coerceIn(1f, 6f)
                    offset = if (scale == 1f) Offset.Zero else offset + pan
                }
            }
            .graphicsLayer(scaleX = scale, scaleY = scale, translationX = offset.x, translationY = offset.y),
    )
}
