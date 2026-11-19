# OkHttp / Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
# WorkManager workers are instantiated reflectively
-keep class * extends androidx.work.ListenableWorker { <init>(...); }
