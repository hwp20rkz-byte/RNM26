#!/usr/bin/env bash
# Builds dist/qazaqsha-oyna.apk without Gradle, using the Debian/Ubuntu Android tools:
#   sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
# plus a JDK (javac). Icons: node tools/make-icons.js (needs Playwright).
set -euo pipefail
cd "$(dirname "$0")"

VERSION_CODE=${VERSION_CODE:-8}
VERSION_NAME=${VERSION_NAME:-3.5}
SDK=${ANDROID_SDK:-/usr/lib/android-sdk}
ANDROID_JAR="$SDK/platforms/android-23/android.jar"
DX="$SDK/build-tools/debian/dx"
KEYSTORE=${KEYSTORE:-android/release.keystore}
KS_PASS=${KS_PASS:-qazaqsha-oyna}

BUILD=build
OUT=dist/qazaqsha-oyna.apk
# TEST=1 ./build.sh → «Test QazaqVerse»: separate package (installs next to the real app), every lesson,
# task and game unlocked, 99 hearts, a «⏭ TEST» skip button and a TEST badge (web/test-mode.js flag).
TEST=${TEST:-0}
PACKAGE=kz.qazaqsha.oyna
if [ "$TEST" = 1 ]; then OUT=dist/qazaqsha-oyna-test.apk; VERSION_NAME="$VERSION_NAME-test"; PACKAGE=kz.qazaqsha.oyna.test; fi
# remove only our own build directory (fixed relative path)
rm -rf -- "./$BUILD"
mkdir -p "$BUILD/gen" "$BUILD/classes" "$BUILD/assets" dist

# 0. TypeScript sources and curriculum data -> web/qv-modules.js, web/curriculum.js (committed, so this is optional)
if [ -d node_modules ]; then npm run -s build; fi

# 1. Web game -> assets (only what the app needs)
cp web/*.html web/*.css web/*.js "$BUILD/assets/"
[ "$TEST" = 1 ] || rm -f "$BUILD/assets/voice-lab.html" "$BUILD/assets/voice-lab.js"   # the voice lab ships in the TEST build only
cp -r web/fonts web/audio web/audio-iseke web/vendor "$BUILD/assets/"
# voice packs from tools/make-audio-fs.mjs (web/audio-<id>/ with a manifest.json) ride along automatically
for d in web/audio-*/; do [ -f "$d/manifest.json" ] && cp -r "${d%/}" "$BUILD/assets/"; done

# 1b. 3D suite (React 19 + R3F, suite/) -> assets/suite; opened from the games tab
if [ -d suite/node_modules ]; then (cd suite && npm run -s build && npm run -s budget); fi
if [ -f suite/dist/index.html ]; then
  mkdir -p "$BUILD/assets/suite" && cp -r suite/dist/. "$BUILD/assets/suite/"
  printf 'window.QSUITE = true;\n' > "$BUILD/assets/suite/available.js"
else
  echo "warning: suite/dist is missing — building the APK without the 3D hall (run: cd suite && npm ci && npm run build)"
fi

# 1c. test flag and test resources (app name «Test QazaqVerse»)
RES=android/res
if [ "$TEST" = 1 ]; then
  printf 'window.QTEST = true;\n' > "$BUILD/assets/test-mode.js"
  # voice lab (tools/make-voice-lab.mjs): every Freedom Speech voice, feature demos and tuning — TEST build only
  if [ -f web/voice-lab/lab-data.js ]; then mkdir -p "$BUILD/assets/voice-lab" && cp web/voice-lab/*.mp3 web/voice-lab/lab-data.js "$BUILD/assets/voice-lab/"; fi
  cp -r android/res "$BUILD/res" && RES="$BUILD/res"
  sed -i 's#<string name="app_name">[^<]*</string>#<string name="app_name">Test QazaqVerse</string>#' "$RES/values/strings.xml"
fi

# 2. R.java
aapt package -f -m -J "$BUILD/gen" -M android/AndroidManifest.xml -S "$RES" -I "$ANDROID_JAR"

# 3. Java -> classes -> classes.dex
javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath "$ANDROID_JAR" -classpath "$ANDROID_JAR" \
  -d "$BUILD/classes" $(find android/src "$BUILD/gen" -name '*.java')
"$DX" --dex --min-sdk-version=21 --output="$BUILD/classes.dex" "$BUILD/classes"

# 4. Package resources + assets, add dex
aapt package -f -M android/AndroidManifest.xml -S "$RES" -A "$BUILD/assets" -I "$ANDROID_JAR" \
  --rename-manifest-package "$PACKAGE" \
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
