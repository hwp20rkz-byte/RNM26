package com.geostamp.app.security

import android.os.SystemClock
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.geostamp.app.data.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Блокировка по уходу в фон (ProcessLifecycleOwner). Холодный старт — всегда заблокировано.
 * Используется монотонное время, чтобы перевод часов не обходил таймаут.
 */
class AppLock(private val settings: SettingsRepository, private val scope: CoroutineScope) : DefaultLifecycleObserver {
    private val _locked = MutableStateFlow(true)
    val locked: StateFlow<Boolean> = _locked.asStateFlow()
    private var backgroundAt = 0L

    private var graceUntil = 0L

    fun unlock() { _locked.value = false }

    /**
     * Вызывается перед переходом в «свои» внешние экраны (WhatsApp, вход Google, настройки GPS):
     * короткий возврат в течение минуты не потребует PIN повторно.
     */
    fun allowShortLeave() { graceUntil = SystemClock.elapsedRealtime() + GRACE_MS }
    fun lockNow() { _locked.value = true }

    override fun onStop(owner: LifecycleOwner) {
        backgroundAt = SystemClock.elapsedRealtime()
    }

    override fun onStart(owner: LifecycleOwner) {
        if (backgroundAt == 0L) return
        val now = SystemClock.elapsedRealtime()
        val away = now - backgroundAt
        val graced = graceUntil > backgroundAt
        graceUntil = 0L
        scope.launch {
            val s = settings.current()
            val timeout = if (graced) maxOf(s.autoLockSec * 1000L, GRACE_MS) else s.autoLockSec * 1000L
            if (s.pinEnabled && away >= timeout) _locked.value = true
        }
    }

    private companion object { const val GRACE_MS = 60_000L }
}
