package com.geostamp.app.ui.lock

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavController
import com.geostamp.app.container
import com.geostamp.app.ui.components.TopBar
import com.geostamp.app.ui.theme.Space
import com.geostamp.app.ui.theme.Tokens
import kotlinx.coroutines.launch

/** Установка PIN: выбор длины 4/6, ввод и подтверждение. Простые PIN вроде 1111/1234 отклоняются. */
@Composable
fun PinSetupScreen(nav: NavController) {
    val c = LocalContext.current.container
    val scope = rememberCoroutineScope()
    var length by remember { mutableIntStateOf(4) }
    var first by remember { mutableStateOf<String?>(null) }
    var entered by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    fun weak(p: String) = p.toSet().size == 1 || "0123456789".contains(p) || "9876543210".contains(p)

    Column(Modifier.fillMaxSize().background(Tokens.Bg).navigationBarsPadding()) {
        TopBar("PIN-код", onBack = { nav.popBackStack() })
        Column(
            Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(if (first == null) "Придумайте PIN" else "Повторите PIN", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(Space.s2))
            if (first == null) {
                Row(horizontalArrangement = Arrangement.spacedBy(Space.s1)) {
                    listOf(4, 6).forEach { n ->
                        FilterChip(selected = length == n, onClick = { length = n; entered = "" }, label = { Text("$n цифр") })
                    }
                }
                Spacer(Modifier.height(Space.s2))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
                repeat(length) { i ->
                    Box(Modifier.size(Space.s2).clip(CircleShape).background(if (i < entered.length) Tokens.Primary else Tokens.Outline))
                }
            }
            Spacer(Modifier.height(Space.s2))
            Text(error ?: " ", style = MaterialTheme.typography.bodySmall, color = Tokens.Error)
            Spacer(Modifier.height(Space.s3))
            PinPad(
                enabled = true,
                onDigit = { d ->
                    if (entered.length >= length) return@PinPad
                    entered += d; error = null
                    if (entered.length == length) {
                        val f = first
                        when {
                            f == null && weak(entered) -> { error = "Слишком простой PIN"; entered = "" }
                            f == null -> { first = entered; entered = "" }
                            f == entered -> scope.launch {
                                c.pin.setPin(entered)
                                c.lock.unlock()
                                nav.popBackStack()
                            }
                            else -> { error = "PIN не совпадает — начните заново"; first = null; entered = "" }
                        }
                    }
                },
                onDelete = { entered = entered.dropLast(1) },
            )
        }
    }
}
