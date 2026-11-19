package com.geostamp.app.ui.lock

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricPrompt
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.geostamp.app.container
import com.geostamp.app.security.PinResult
import com.geostamp.app.ui.theme.Space
import com.geostamp.app.ui.theme.Tokens
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

fun biometricAvailable(activity: FragmentActivity): Boolean =
    BiometricManager.from(activity).canAuthenticate(BIOMETRIC_STRONG or BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS

fun showBiometric(activity: FragmentActivity, onSuccess: () -> Unit) {
    val prompt = BiometricPrompt(activity, ContextCompat.getMainExecutor(activity),
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onSuccess()
        })
    prompt.authenticate(
        BiometricPrompt.PromptInfo.Builder()
            .setTitle("Разблокировка GeoStamp")
            .setSubtitle("Подтвердите отпечатком или лицом")
            .setAllowedAuthenticators(BIOMETRIC_STRONG or BIOMETRIC_WEAK)
            .setNegativeButtonText("Ввести PIN")
            .build(),
    )
}

@Composable
fun LockScreen(activity: FragmentActivity) {
    val c = activity.container
    val settings by c.settings.flow.collectAsState(initial = null)
    val s = settings ?: return
    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current
    var entered by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    var lockedUntil by remember { mutableLongStateOf(s.lockoutUntil) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val shake = remember { Animatable(0f) }
    val bioOk = s.biometric && biometricAvailable(activity)

    LaunchedEffect(Unit) { if (bioOk) showBiometric(activity) { c.lock.unlock() } }
    LaunchedEffect(lockedUntil) {
        while (lockedUntil > System.currentTimeMillis()) { now = System.currentTimeMillis(); delay(500) }
        now = System.currentTimeMillis()
    }
    val lockedOut = lockedUntil > now

    fun submit(pin: String) = scope.launch {
        when (val r = c.pin.verify(pin)) {
            PinResult.Ok -> c.lock.unlock()
            is PinResult.Wrong -> {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                message = "Неверный PIN. Осталось попыток: ${r.attemptsLeftBeforeLock}"
                entered = ""
                for (x in listOf(16f, -12f, 8f, -4f, 0f)) shake.animateTo(x, tween(45))
            }
            is PinResult.LockedOut -> { lockedUntil = r.untilMillis; entered = ""; message = null }
        }
    }

    // Полностью непрозрачный слой поверх приложения, перехватывает все касания
    Box(
        Modifier.fillMaxSize().background(Tokens.Bg)
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {},
    ) {
        Column(
            Modifier.fillMaxSize().systemBarsPadding().padding(Space.s3),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(Icons.Filled.Lock, null, tint = Tokens.Primary, modifier = Modifier.size(Space.s6))
            Spacer(Modifier.height(Space.s2))
            Text("Введите PIN-код", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(Space.s3))
            Row(
                Modifier.offset { IntOffset(shake.value.dp.roundToPx(), 0) }
                    .semantics { contentDescription = "Введено цифр: ${entered.length} из ${s.pinLength}" },
                horizontalArrangement = Arrangement.spacedBy(Space.s2),
            ) {
                repeat(s.pinLength) { i ->
                    Box(
                        Modifier.size(Space.s2).clip(CircleShape)
                            .background(if (i < entered.length) Tokens.Primary else Tokens.Outline),
                    )
                }
            }
            Spacer(Modifier.height(Space.s2))
            val info = if (lockedOut) "Слишком много попыток. Подождите ${((lockedUntil - now) / 1000.0).roundToInt()} с" else message
            Text(info ?: " ", style = MaterialTheme.typography.bodySmall, color = Tokens.Error)
            Spacer(Modifier.height(Space.s4))
            PinPad(
                enabled = !lockedOut,
                extraIcon = if (bioOk) Icons.Filled.Fingerprint else null,
                onExtra = { showBiometric(activity) { c.lock.unlock() } },
                onDigit = { d ->
                    if (entered.length < s.pinLength) {
                        entered += d
                        message = null
                        if (entered.length == s.pinLength) submit(entered)
                    }
                },
                onDelete = { entered = entered.dropLast(1) },
            )
        }
    }
}

@Composable
fun PinPad(
    enabled: Boolean, onDigit: (Char) -> Unit, onDelete: () -> Unit,
    extraIcon: ImageVector? = null, onExtra: () -> Unit = {},
) {
    val rows = listOf("123", "456", "789")
    Column(verticalArrangement = Arrangement.spacedBy(Space.s2)) {
        rows.forEach { r ->
            Row(horizontalArrangement = Arrangement.spacedBy(Space.s3)) {
                r.forEach { d -> PadKey(enabled, label = d.toString()) { onDigit(d) } }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(Space.s3)) {
            if (extraIcon != null) PadKey(enabled, icon = extraIcon, description = "Биометрия", onClick = onExtra)
            else Spacer(Modifier.size(72.dp))
            PadKey(enabled, label = "0") { onDigit('0') }
            PadKey(enabled, icon = Icons.AutoMirrored.Filled.Backspace, description = "Стереть", onClick = onDelete)
        }
    }
}

@Composable
private fun PadKey(enabled: Boolean, label: String? = null, icon: ImageVector? = null, description: String? = null, onClick: () -> Unit) {
    Box(
        Modifier.size(72.dp).clip(CircleShape).background(Tokens.Surface)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (label != null) Text(label, style = MaterialTheme.typography.displaySmall, color = if (enabled) Tokens.Text else Tokens.TextMuted)
        if (icon != null) Icon(icon, description, tint = Tokens.TextMuted)
    }
}
