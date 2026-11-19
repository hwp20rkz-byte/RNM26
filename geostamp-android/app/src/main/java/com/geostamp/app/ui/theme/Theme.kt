package com.geostamp.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Дизайн-токены. Три бренд-цвета (primary / accent / neutral) в HSL + тональные варианты,
 * статусные цвета — только для статусов. Все компоненты берут цвета и отступы отсюда.
 */
object Tokens {
    // Brand
    val Primary = Color.hsl(24f, 1.00f, 0.55f)       // ярко-оранжевый — кнопки, подписи, опции
    val PrimaryContainer = Color.hsl(24f, 0.60f, 0.18f)
    val OnPrimary = Color.hsl(222f, 0.20f, 0.08f)
    val Accent = Color.hsl(172f, 0.62f, 0.46f)        // бирюзовый — GPS / облако
    val AccentContainer = Color.hsl(172f, 0.45f, 0.15f)

    // Neutral (тональная шкала)
    val Bg = Color.hsl(222f, 0.14f, 0.07f)
    val Surface = Color.hsl(222f, 0.13f, 0.11f)
    val SurfaceHigh = Color.hsl(222f, 0.12f, 0.15f)
    val Outline = Color.hsl(222f, 0.10f, 0.24f)
    val Text = Color.hsl(220f, 0.20f, 0.95f)
    val TextMuted = Color.hsl(220f, 0.10f, 0.66f)

    // Status — только для статусов
    val Success = Color.hsl(145f, 0.58f, 0.50f)
    val Warning = Color.hsl(42f, 0.95f, 0.58f)
    val Error = Color.hsl(0f, 0.78f, 0.62f)
    val Recording = Color.hsl(0f, 0.85f, 0.55f)

    val Scrim = Color.hsl(222f, 0.30f, 0.03f).copy(alpha = 0.55f)
}

/** 8-point spacing. */
object Space {
    val s1 = 8.dp
    val s2 = 16.dp
    val s3 = 24.dp
    val s4 = 32.dp
    val s6 = 48.dp
    val s8 = 64.dp
    val radius = 16.dp
    val radiusLarge = 24.dp
    val touch = 48.dp
}

/** Ровно 5 размеров шрифта. */
private val AppTypography = Typography(
    displaySmall = TextStyle(fontSize = 32.sp, lineHeight = 40.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.5).sp),
    titleLarge = TextStyle(fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 17.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 17.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 15.sp, lineHeight = 22.sp),
    labelLarge = TextStyle(fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
    bodySmall = TextStyle(fontSize = 13.sp, lineHeight = 18.sp),
    labelSmall = TextStyle(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
)

private val Scheme = darkColorScheme(
    primary = Tokens.Primary,
    onPrimary = Tokens.OnPrimary,
    primaryContainer = Tokens.PrimaryContainer,
    onPrimaryContainer = Tokens.Text,
    secondary = Tokens.Accent,
    onSecondary = Tokens.OnPrimary,
    secondaryContainer = Tokens.AccentContainer,
    onSecondaryContainer = Tokens.Text,
    background = Tokens.Bg,
    onBackground = Tokens.Text,
    surface = Tokens.Surface,
    onSurface = Tokens.Text,
    surfaceVariant = Tokens.SurfaceHigh,
    onSurfaceVariant = Tokens.TextMuted,
    surfaceContainer = Tokens.Surface,
    surfaceContainerHigh = Tokens.SurfaceHigh,
    surfaceContainerHighest = Tokens.SurfaceHigh,
    outline = Tokens.Outline,
    outlineVariant = Tokens.Outline,
    error = Tokens.Error,
)

@Composable
fun GeoStampTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Scheme, typography = AppTypography, content = content)
}
