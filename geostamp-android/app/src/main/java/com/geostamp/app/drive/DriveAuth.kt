package com.geostamp.app.drive

import android.content.Context
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import kotlinx.coroutines.tasks.await

/**
 * Авторизация Google через AuthorizationClient (Google Identity Services) — актуальная замена
 * устаревшему GoogleSignIn. client_id в коде не нужен: Google сопоставляет OAuth-клиент
 * по имени пакета + SHA-1 подписи (настраивается в Google Cloud Console).
 */
object DriveAuth {
    const val SCOPE_DRIVE_FILE = "https://www.googleapis.com/auth/drive.file"

    fun request(): AuthorizationRequest =
        AuthorizationRequest.builder().setRequestedScopes(listOf(Scope(SCOPE_DRIVE_FILE))).build()

    /** Если пользователь уже дал согласие — вернёт токен без UI; иначе результат с resolution (PendingIntent). */
    suspend fun authorize(context: Context): AuthorizationResult =
        Identity.getAuthorizationClient(context).authorize(request()).await()
}
