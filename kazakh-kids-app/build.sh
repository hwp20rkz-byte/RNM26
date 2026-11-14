#!/usr/bin/env bash
# Builds dist/qazaqsha-oyna.apk without Gradle, using the Debian/Ubuntu Android tools:
#   sudo apt-get install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
# plus a JDK (javac). Icons: node tools/make-icons.js (needs Playwright).
set -euo pipefail
cd "$(dirname "$0")"

VERSION_CODE=${VERSION_CODE:-10}
VERSION_NAME=${VERSION_NAME:-3.7}
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
# OPUS=1 → speech in Ogg Opus instead of mp3 (owner's experiment 14.11: test on Android 5–7 before the release build)
OPUS=${OPUS:-0}
if [ "$OPUS" = 1 ]; then OUT="${OUT%.apk}-opus.apk"; VERSION_NAME="$VERSION_NAME-opus"; fi
# remove only our own build directory (fixed relative path)
rm -rf -- "./$BUILD"
mkdir -p "$BUILD/gen" "$BUILD/classes" "$BUILD/assets" dist

# 0. TypeScript sources and curriculum data -> web/qv-modules.js, web/curriculum.js (committed, so this is optional)
if [ -d node_modules ]; then npm run -s build; fi

# 1. Web game -> assets (only what the app needs)
cp web/*.html web/*.css web/*.js "$BUILD/assets/"
rm -f "$BUILD/assets/voice-lab.html" "$BUILD/assets/voice-lab.js"   # the voice lab (tools/make-voice-lab.mjs) stays a desktop tool: in no APK (owner, 14.11)
cp -r web/fonts web/audio web/audio-iseke web/vendor "$BUILD/assets/"
# voice packs from tools/make-audio-fs.mjs (web/audio-<id>/ with a manifest.json) ride along automatically
for d in web/audio-*/; do [ -f "$d/manifest.json" ] && cp -r "${d%/}" "$BUILD/assets/"; done
# service files of the voice tools (recognition log, skip list, hero render log) stay out of the APK
rm -f "$BUILD"/assets/audio-*/verify.csv "$BUILD"/assets/audio-*/skip.json "$BUILD/assets/audio/heroes-fs.json"

# 1b. 3D suite (React 19 + R3F, suite/) -> assets/suite; opened from the games tab
if [ -d suite/node_modules ]; then (cd suite && npm run -s build && npm run -s budget); fi
if [ -f suite/dist/index.html ]; then
  mkdir -p "$BUILD/assets/suite" && cp -r suite/dist/. "$BUILD/assets/suite/"
  printf 'window.QSUITE = true;\n' > "$BUILD/assets/suite/available.js"
else
  echo "warning: suite/dist is missing — building the APK without the 3D hall (run: cd suite && npm ci && npm run build)"
fi

# 1b'. OPUS=1: every speech take → Ogg Opus 20 kbit/s mono (voice mode), only in the build copy — the repository keeps
# mp3. Converted takes are cached in .cache/opus (same name, newer than the mp3 → reused). The players read the
# extension from window.QAUDIO_EXT (assets/audio-format.js, loaded by the game and the 3D hall).
if [ "$OPUS" = 1 ]; then
  command -v ffmpeg >/dev/null || { echo "OPUS=1 needs ffmpeg with libopus"; exit 1; }
  CACHE=.cache/opus
  for d in "$BUILD"/assets/audio "$BUILD"/assets/audio-*; do
    [ -d "$d" ] || continue
    name=$(basename "$d"); mkdir -p "$CACHE/$name"
    find "$d" -maxdepth 1 -name '*.mp3' -printf '%f\n' | sed 's/\.mp3$//' | \
      xargs -P "$(nproc)" -I{} sh -c 'src="web/'"$name"'/{}.mp3"; dst="'"$CACHE/$name"'/{}.ogg";
        [ -s "$dst" ] && [ "$dst" -nt "$src" ] || ffmpeg -nostdin -loglevel error -y -i "$src" -ac 1 -c:a libopus -b:a 20k -application voip "$dst"'
    find "$d" -maxdepth 1 -name '*.mp3' -printf '%f\n' | sed 's/\.mp3$//' | while read -r k; do cp "$CACHE/$name/$k.ogg" "$d/$k.ogg"; rm "$d/$k.mp3"; done
  done
  printf "window.QAUDIO_EXT = 'ogg';\n" > "$BUILD/assets/audio-format.js"
  cp "$BUILD/assets/audio-format.js" "$BUILD/assets/suite/audio-format.js" 2>/dev/null || true
  sed -i 's#<script src="data.js"></script>#<script src="audio-format.js"></script>\n  <script src="data.js"></script>#' "$BUILD/assets/index.html"
  [ -f "$BUILD/assets/suite/index.html" ] && sed -i 's#</head>#<script src="./audio-format.js"></script></head>#' "$BUILD/assets/suite/index.html"
  left=$(find "$BUILD"/assets/audio* -name '*.mp3' | wc -l); [ "$left" = 0 ] || { echo "OPUS: $left mp3 left"; exit 1; }
  echo "opus: $(find "$BUILD"/assets/audio* -name '*.ogg' | wc -l) takes, $(du -sh "$BUILD"/assets/audio* | awk '{s=s" "$1} END{print s}')"
fi

# 1c. test flag and test resources (app name «Test QazaqVerse»)
RES=android/res
if [ "$TEST" = 1 ]; then
  printf 'window.QTEST = true;\n' > "$BUILD/assets/test-mode.js"
  # 3D hall: the same flag shows «⏭ TEST» (autoSolve) in every suite game (suite/src/lib/testMode.tsx)
  if [ -f "$BUILD/assets/suite/index.html" ]; then
    printf 'window.QTEST = true;\n' > "$BUILD/assets/suite/test-mode.js"
    sed -i 's#</head>#<script src="./test-mode.js"></script></head>#' "$BUILD/assets/suite/index.html"
  fi
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
