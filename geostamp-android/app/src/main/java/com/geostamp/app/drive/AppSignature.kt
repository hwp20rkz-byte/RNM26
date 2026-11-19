package com.geostamp.app.drive

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import java.security.MessageDigest

/** SHA-1 сертификата, которым подписан установленный APK, — именно его ждёт OAuth-клиент Android. */
object AppSignature {
    fun sha1(context: Context): String? = runCatching {
        val pm = context.packageManager
        val certs = if (Build.VERSION.SDK_INT >= 28) {
            pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES).signingInfo?.apkContentsSigners
        } else {
            @Suppress("DEPRECATION")
            pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES).signatures
        }
        val cert = certs?.firstOrNull()?.toByteArray() ?: return null
        MessageDigest.getInstance("SHA-1").digest(cert).joinToString(":") { "%02X".format(it) }
    }.getOrNull()
}

/** Человеческое объяснение ошибок Google Identity / Drive. */
object DriveErrors {
    fun explain(e: Throwable): String {
        val api = e as? ApiException ?: (e.cause as? ApiException)
        if (api != null) return when (api.statusCode) {
            CommonStatusCodes.DEVELOPER_ERROR ->
                "Код 10: в Google Cloud нет OAuth-клиента Android для этого пакета и SHA-1. Откройте «Инструкция и SHA-1»."
            CommonStatusCodes.NETWORK_ERROR -> "Нет интернета (код 7). Повторите при подключении."
            CommonStatusCodes.CANCELED, 12501 -> "Вход отменён."
            CommonStatusCodes.SIGN_IN_REQUIRED -> "Нужно войти в аккаунт Google на телефоне (код 4)."
            CommonStatusCodes.INTERNAL_ERROR -> "Внутренняя ошибка Google Play сервисов (код 8). Обновите Google Play сервисы."
            else -> "Ошибка Google (код ${api.statusCode}): ${api.message}"
        }
        val msg = e.message.orEmpty()
        return when {
            "accessNotConfigured" in msg || "has not been used" in msg || "SERVICE_DISABLED" in msg ->
                "Google Drive API не включён в проекте Google Cloud. APIs & Services → Library → Google Drive API → Enable."
            "insufficient" in msg.lowercase() -> "Нет разрешения на Диск — подключите заново и отметьте галочку доступа."
            "403" in msg -> "Доступ запрещён (403). Проверьте, что ваш аккаунт добавлен в Test users на экране OAuth consent."
            "401" in msg -> "Токен устарел (401). Отключите и подключите Диск заново."
            else -> "Ошибка: ${msg.take(200)}"
        }
    }
}
