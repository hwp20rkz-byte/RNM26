#!/usr/bin/env bash
# Builds dist/qazaqsha-oyna.apk without Gradle, using the Debian/Ubuntu Android tools:
#   sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
# plus a JDK (javac). Icons: node tools/make-icons.js (needs Playwright).
set -euo pipefail
cd "$(dirname "$0")"

VERSION_CODE=${VERSION_CODE:-5}
VERSION_NAME=${VERSION_NAME:-3.2}
SDK=${ANDROID_SDK:-/usr/lib/android-sdk}
ANDROID_JAR="$SDK/platforms/android-23/android.jar"
DX="$SDK/build-tools/debian/dx"
KEYSTORE=${KEYSTORE:-android/release.keystore}
KS_PASS=${KS_PASS:-qazaqsha-oyna}

BUILD=build
OUT=dist/qazaqsha-oyna.apk
# remove only our own build directory (fixed relative path)
rm -rf -- "./$BUILD"
mkdir -p "$BUILD/gen" "$BUILD/classes" "$BUILD/assets" dist

# 1. Web game -> assets (only what the app needs)
cp web/*.html web/*.css web/*.js "$BUILD/assets/"
cp -r web/fonts web/audio web/audio-iseke web/vendor "$BUILD/assets/"

# 2. R.java
aapt package -f -m -J "$BUILD/gen" -M android/AndroidManifest.xml -S android/res -I "$ANDROID_JAR"

# 3. Java -> classes -> classes.dex
javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath "$ANDROID_JAR" -classpath "$ANDROID_JAR" \
  -d "$BUILD/classes" $(find android/src "$BUILD/gen" -name '*.java')
"$DX" --dex --min-sdk-version=21 --output="$BUILD/classes.dex" "$BUILD/classes"

# 4. Package resources + assets, add dex
aapt package -f -M android/AndroidManifest.xml -S android/res -A "$BUILD/assets" -I "$ANDROID_JAR" \
  --min-sdk-version 21 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -0 arsc -F "$BUILD/unsigned.apk"
(cd "$BUILD" && aapt add -f unsigned.apk classes.dex >/dev/null)

# 5. Align + sign (v1+v2+v3)
zipalign -f -p 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -alias qazaqsha -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" -dname "CN=Qazaqsha Oyna, O=RNM26, C=KZ"
fi
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --ks-key-alias qazaqsha \
  --min-sdk-version 21 --out "$OUT" "$BUILD/aligned.apk"
apksigner verify --verbose "$OUT" | head -6
ls -la "$OUT"
