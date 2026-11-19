package com.geostamp.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.geostamp.app.location.GeoFix
import com.geostamp.app.stamp.StampData
import com.geostamp.app.stamp.StampOptions
import com.geostamp.app.stamp.StampRenderer
import com.geostamp.app.stamp.StampTemplate
import com.geostamp.app.ui.theme.Space
import com.geostamp.app.ui.theme.Tokens

@Composable
fun TopBar(title: String, onBack: (() -> Unit)?, actions: @Composable RowScope.() -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = Space.s1, vertical = Space.s1).heightIn(min = Space.s6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Назад") }
        Text(
            title, style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.weight(1f).padding(start = if (onBack == null) Space.s1 else 0.dp),
            maxLines = 1, overflow = TextOverflow.Ellipsis,
        )
        actions()
    }
}

@Composable
fun SectionTitle(text: String) {
    Text(
        text.uppercase(), style = MaterialTheme.typography.labelSmall, color = Tokens.Primary,
        modifier = Modifier.padding(start = Space.s2, end = Space.s2, top = Space.s3, bottom = Space.s1),
    )
}

@Composable
fun Card(modifier: Modifier = Modifier, onClick: (() -> Unit)? = null, color: Color = Tokens.Surface, content: @Composable () -> Unit) {
    val shape = RoundedCornerShape(Space.radius)
    Box(
        modifier.clip(shape).background(color)
            .then(if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier),
    ) { content() }
}

@Composable
fun SettingRow(
    icon: ImageVector, title: String, subtitle: String? = null,
    onClick: (() -> Unit)? = null, trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        Modifier.fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .heightIn(min = Space.s8)
            .padding(horizontal = Space.s2, vertical = Space.s1),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Space.s2),
    ) {
        Icon(icon, null, tint = Tokens.TextMuted)
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge)
            if (subtitle != null) Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Tokens.TextMuted)
        }
        trailing?.invoke()
    }
}

@Composable
fun SwitchRow(icon: ImageVector, title: String, subtitle: String? = null, checked: Boolean, onChange: (Boolean) -> Unit) {
    SettingRow(icon, title, subtitle, onClick = { onChange(!checked) }) {
        Switch(
            checked = checked, onCheckedChange = onChange,
            colors = SwitchDefaults.colors(checkedTrackColor = Tokens.Primary, checkedThumbColor = Tokens.OnPrimary),
        )
    }
}

/** Индикатор GPS: зелёный — точная позиция, жёлтый — поиск, красный — выключено/нет доступа. */
@Composable
fun GpsDot(fix: GeoFix, modifier: Modifier = Modifier) {
    val color = when {
        !fix.permission || !fix.gpsEnabled -> Tokens.Error
        fix.isGood -> Tokens.Success
        else -> Tokens.Warning
    }
    Box(modifier.size(Space.s1 + Space.s1 / 4).clip(CircleShape).background(color))
}

/** Превью штампа через тот же рендерер, что и итоговый файл. */
@Composable
fun StampPreview(data: StampData, template: StampTemplate, options: StampOptions, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        drawIntoCanvas { StampRenderer.draw(it.nativeCanvas, size.width.toInt(), size.height.toInt(), data, template, options) }
    }
}
