package com.geostamp.app.security

import android.util.Base64
import com.geostamp.app.data.SettingsRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/** PBKDF2-HMAC-SHA256 со случайной солью. PIN в открытом виде нигде не хранится. */
object PinHasher {
    const val ITERATIONS = 120_000
    private const val KEY_BITS = 256

    fun newSalt(): ByteArray = ByteArray(16).also { SecureRandom().nextBytes(it) }

    fun hash(pin: String, salt: ByteArray, iterations: Int = ITERATIONS): ByteArray {
        val spec = PBEKeySpec(pin.toCharArray(), salt, iterations, KEY_BITS)
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        } finally {
            spec.clearPassword()
        }
    }

    /** Сравнение за постоянное время. */
    fun matches(pin: String, salt: ByteArray, expected: ByteArray, iterations: Int = ITERATIONS): Boolean =
        MessageDigest.isEqual(hash(pin, salt, iterations), expected)

    /** Пауза после серии ошибок: 5 ошибок → 30 с, далее удвоение, максимум 15 минут. */
    fun lockoutMillis(failedAttempts: Int): Long {
        if (failedAttempts < 5) return 0
        val steps = (failedAttempts - 5).coerceAtMost(5)
        return (30_000L shl steps).coerceAtMost(15 * 60_000L)
    }
}

sealed interface PinResult {
    data object Ok : PinResult
    data class Wrong(val attemptsLeftBeforeLock: Int) : PinResult
    data class LockedOut(val untilMillis: Long) : PinResult
}

class PinManager(private val settings: SettingsRepository) {

    private fun b64(b: ByteArray) = Base64.encodeToString(b, Base64.NO_WRAP)
    private fun unb64(s: String) = Base64.decode(s, Base64.NO_WRAP)

    suspend fun setPin(pin: String) = withContext(Dispatchers.Default) {
        val salt = PinHasher.newSalt()
        val hash = PinHasher.hash(pin, salt)
        settings.update {
            it.copy(pinEnabled = true, pinHash = b64(hash), pinSalt = b64(salt), pinLength = pin.length,
                failedAttempts = 0, lockoutUntil = 0)
        }
    }

    suspend fun disable() = settings.update {
        it.copy(pinEnabled = false, pinHash = "", pinSalt = "", biometric = false, failedAttempts = 0, lockoutUntil = 0)
    }

    suspend fun verify(pin: String): PinResult = withContext(Dispatchers.Default) {
        val s = settings.current()
        val now = System.currentTimeMillis()
        if (s.lockoutUntil > now) return@withContext PinResult.LockedOut(s.lockoutUntil)
        val ok = runCatching { PinHasher.matches(pin, unb64(s.pinSalt), unb64(s.pinHash)) }.getOrDefault(false)
        if (ok) {
            settings.update { it.copy(failedAttempts = 0, lockoutUntil = 0) }
            PinResult.Ok
        } else {
            val failed = s.failedAttempts + 1
            val lock = PinHasher.lockoutMillis(failed)
            settings.update { it.copy(failedAttempts = failed, lockoutUntil = if (lock > 0) now + lock else 0) }
            if (lock > 0) PinResult.LockedOut(now + lock) else PinResult.Wrong(5 - failed)
        }
    }

    suspend fun resetFailures() = settings.update { it.copy(failedAttempts = 0, lockoutUntil = 0) }
}
