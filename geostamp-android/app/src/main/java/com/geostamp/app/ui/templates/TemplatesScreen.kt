package com.geostamp.app.ui.templates

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.geostamp.app.container
import com.geostamp.app.stamp.StampData
import com.geostamp.app.stamp.StampOptions
import com.geostamp.app.stamp.StampTemplate
import com.geostamp.app.ui.components.StampPreview
import com.geostamp.app.ui.components.TopBar
import com.geostamp.app.ui.theme.Space
import com.geostamp.app.ui.theme.Tokens
import kotlinx.coroutines.launch

@Composable
fun TemplatesScreen(nav: NavController) {
    val c = LocalContext.current.container
    val settings by c.settings.flow.collectAsState(initial = null)
    val s = settings ?: return
    val scope = rememberCoroutineScope()
    // Превью с реальными опциями пользователя, но всеми полями — чтобы было видно, как выглядит «полный» штамп
    val previewOptions = s.stampOptions.copy(showProject = true, showNote = true, showAltitude = true)
    val sample = StampData.SAMPLE.copy(timeMillis = System.currentTimeMillis())
    // Нейтральный «кадр»-подложка, чтобы читаемость штампа проверялась на фото-подобном фоне
    val photoLike = Brush.verticalGradient(listOf(Color.hsl(200f, 0.25f, 0.45f), Color.hsl(30f, 0.20f, 0.35f), Color.hsl(220f, 0.15f, 0.18f)))

    Column(Modifier.fillMaxSize().background(Tokens.Bg)) {
        TopBar("Шаблон штампа", onBack = { nav.popBackStack() })
        LazyVerticalGrid(
            columns = GridCells.Adaptive(160.dp),
            contentPadding = PaddingValues(Space.s2),
            horizontalArrangement = Arrangement.spacedBy(Space.s2),
            verticalArrangement = Arrangement.spacedBy(Space.s2),
        ) {
            items(StampTemplate.entries) { t ->
                val sel = t == s.template
                Column(
                    Modifier.clip(RoundedCornerShape(Space.radius)).background(Tokens.Surface)
                        .border(if (sel) 3.dp else 0.dp, if (sel) Tokens.Primary else Color.Transparent, RoundedCornerShape(Space.radius))
                        .clickable { scope.launch { c.settings.update { it.copy(template = t) }; nav.popBackStack() } },
                ) {
                    Box(Modifier.fillMaxWidth().aspectRatio(3f / 4f).background(photoLike)) {
                        StampPreview(sample, t, previewOptions, Modifier.fillMaxSize())
                    }
                    Column(Modifier.padding(Space.s1 + Space.s1 / 2)) {
                        Text(t.title, style = MaterialTheme.typography.titleMedium, color = if (sel) Tokens.Primary else Tokens.Text)
                        Text(t.description, style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted, minLines = 2, maxLines = 2)
                    }
                }
            }
        }
    }
}
