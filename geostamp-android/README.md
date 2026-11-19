# GeoStamp — камера с геоштампом для Android

Нативное приложение (Kotlin + Jetpack Compose + CameraX + Media3): фото и видео со «вшитыми» временем, адресом и координатами, приватный архив под PIN, отправка в WhatsApp, загрузка на Google Диск.

## Возможности

| Функция | Как реализовано |
|---|---|
| Фото/видео со штампом | CameraX `LifecycleCameraController`; штамп рисуется одним `StampRenderer` на превью, фото (Canvas) и каждом кадре видео (Media3 `CanvasOverlay`) — превью совпадает с результатом |
| 6 шаблонов | Классика, Фотоотчёт, Бейдж, Минимал, Геодезия, Путешествие |
| Защита PIN-кодом | PBKDF2-HMAC-SHA256 (120k итераций, соль), пауза с удвоением после 5 ошибок, автоблокировка по уходу в фон, биометрия, `FLAG_SECURE` |
| Быстрый запуск GPS | Плитка «GPS-камера» в шторке, ярлыки на иконке (фото/видео/галерея), системный диалог включения GPS в один тап |
| WhatsApp | Одиночная и пакетная отправка фото+видео с подписью (время, адрес, ссылка на карту), WhatsApp и WhatsApp Business, иначе общий «Поделиться» |
| Google Диск | Google Identity `AuthorizationClient`, scope `drive.file`, resumable upload, WorkManager с ретраями, «только Wi-Fi», папки `GeoStamp/Объект/Дата` |

### Дополнительные функции (мои предложения, уже в коде)
- **Приватное хранилище**: снимки в `filesDir`, не видны галерее и другим приложениям; копия в галерею — опция.
- **Проверка подлинности**: SHA-256 каждого файла сохраняется при съёмке и уходит в `appProperties` на Диске; кнопка «Проверить» в просмотре.
- **Режим «Фотоотчёт»**: поле «Объект/проект» и «Примечание» — в штампе, подписи WhatsApp и структуре папок Диска.
- **Живые часы в видео**: время в штампе идёт вместе с записью.
- **Камера без PIN**: снимать можно сразу из шторки, архив открывается только после PIN.
- **EXIF**: GPS, высота, время, описание пишутся в JPEG.
- **Офлайн**: без интернета штамп содержит координаты, адрес подтягивается при наличии геокодера.

## Сборка

**Через GitHub Actions** (уже настроено): каждый push в `geostamp-android/**` запускает тесты и собирает `app-debug.apk` — скачать в Actions → run → Artifacts.

**Локально**: Android Studio Ladybug+ → Open `geostamp-android/` → Run. JDK 17, compileSdk 35, minSdk 26.

## Подключение Google Диска (обязательно, иначе загрузка не заработает)
1. [Google Cloud Console](https://console.cloud.google.com/) → создать проект → **APIs & Services → Library → Google Drive API → Enable**.
2. **OAuth consent screen**: External, добавить scope `.../auth/drive.file`, добавить свой Google-аккаунт в Test users.
3. **Credentials → Create credentials → OAuth client ID → Android**: package `com.geostamp.app`, SHA-1 ключа подписи
   (`./gradlew signingReport` для debug или `keytool -list -v -keystore release.jks`).
4. client_id в код вставлять не нужно — Google сопоставляет клиента по пакету и SHA-1.

> Debug APK из CI подписан случайным ключом каждой сборки → SHA-1 меняется. Для стабильной работы Диска
> соберите локально или задайте release-подпись через secrets `GEOSTAMP_KEYSTORE*` (см. `app/build.gradle.kts`).

## Архитектура
```
app/src/main/java/com/geostamp/app/
├── GeoStampApp.kt        AppContainer (ручной DI), Coil, WorkManager
├── MainActivity.kt       навигация, PIN-гейт, ярлыки/плитка
├── camera/               CaptureProcessor: штамп → JPEG/MP4, EXIF, SHA-256
├── stamp/                StampRenderer (6 шаблонов), форматирование
├── location/             Fused Location + геокодер + диалог включения GPS
├── security/             PinHasher/PinManager, AppLock (ProcessLifecycle)
├── drive/                DriveAuth, DriveApi (REST v3), DriveUploadWorker
├── share/                WhatsApp / карта / видеоплеер
├── tile/                 Quick Settings плитка
└── ui/                   Compose-экраны, токены дизайна
```
