plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// Release-подпись берётся из переменных окружения (CI secrets), ключи в репозиторий не попадают.
val releaseKeystore: String? = System.getenv("GEOSTAMP_KEYSTORE")

android {
    namespace = "com.geostamp.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.geostamp.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        vectorDrawables.useSupportLibrary = true
    }

    signingConfigs {
        // Постоянный debug-ключ в репозитории: одинаковый SHA-1 у всех сборок (CI и локальных),
        // поэтому OAuth-клиент Google Диска регистрируется один раз и не «слетает» при обновлении.
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
        if (releaseKeystore != null) {
            create("release") {
                storeFile = file(releaseKeystore)
                storePassword = System.getenv("GEOSTAMP_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("GEOSTAMP_KEY_ALIAS")
                keyPassword = System.getenv("GEOSTAMP_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (releaseKeystore != null) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources { excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.process)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.camerax.core)
    implementation(libs.camerax.camera2)
    implementation(libs.camerax.lifecycle)
    implementation(libs.camerax.video)
    implementation(libs.camerax.view)

    implementation(libs.media3.transformer)
    implementation(libs.media3.effect)
    implementation(libs.media3.common)

    implementation(libs.play.location)
    implementation(libs.play.auth)
    implementation(libs.coroutines.play)

    implementation(libs.work.runtime)
    implementation(libs.datastore.preferences)
    implementation(libs.biometric)
    implementation(libs.exifinterface)
    implementation(libs.coil.compose)
    implementation(libs.coil.video)
    implementation(libs.okhttp)

    testImplementation(libs.junit)
}
