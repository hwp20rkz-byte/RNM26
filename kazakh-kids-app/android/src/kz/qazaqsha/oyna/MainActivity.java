package kz.qazaqsha.oyna;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Full-screen WebView that runs the offline game from assets/, plus a small JS bridge ("Android"):
 *   speak / ttsState      — the phone's own Kazakh TTS (fallback; the game ships its own recordings)
 *   vibrate               — haptics for the auction hammer and arcade hits
 *   sttAvailable/sttStart — the phone's speech recogniser (kk-KZ) for pronunciation tasks
 * The microphone is also exposed to the page (getUserMedia) for the optional QazaqVerse voice server.
 */
public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    private static final Locale KAZAKH = new Locale("kk", "KZ");
    private static final int REQ_MIC = 7;

    private WebView web;
    private TextToSpeech tts;
    /** "init" | "kk" (Kazakh voice ready) | "nokk" (engine has no Kazakh) | "none" (no engine). */
    private volatile String ttsState = "init";

    private SpeechRecognizer recognizer;
    private volatile boolean sttOk;
    private PermissionRequest pendingWebMic;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window w = getWindow();
        w.setStatusBarColor(Color.WHITE);
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 23) {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
        setVolumeControlStream(AudioManager.STREAM_MUSIC);

        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        // The page is bundled and navigation is locked to assets (see below), so letting it call the
        // parent-configured voice server on the local network over plain HTTP is safe.
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        web.setWebViewClient(new WebViewClient() {
            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Stay inside the bundled game; never navigate to the web.
                return !url.startsWith("file:///android_asset/");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        grantWebMic(request);
                    }
                });
            }
        });
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");

        tts = new TextToSpeech(this, this);
        probeRecognizer();
    }

    /* ---------------- text to speech (fallback voice) ---------------- */

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS || tts == null) {
            ttsState = "none";
            return;
        }
        checkKazakh();
    }

    private void checkKazakh() {
        try {
            int r = tts.isLanguageAvailable(KAZAKH);
            if (r >= TextToSpeech.LANG_AVAILABLE) {
                tts.setLanguage(KAZAKH);
                tts.setSpeechRate(0.85f);
                ttsState = "kk";
            } else {
                ttsState = "nokk";
            }
        } catch (Exception e) {
            ttsState = "none";
        }
    }

    /* ---------------- microphone ---------------- */

    private boolean hasMic() {
        return Build.VERSION.SDK_INT < 23 || checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void askMic() {
        if (Build.VERSION.SDK_INT >= 23) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
        }
    }

    /** getUserMedia() from the page: only audio capture is ever granted. */
    private void grantWebMic(PermissionRequest request) {
        boolean wantsAudio = false;
        for (String r : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
                wantsAudio = true;
            }
        }
        if (!wantsAudio) {
            request.deny();
        } else if (hasMic()) {
            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            pendingWebMic = request;
            askMic();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != REQ_MIC || pendingWebMic == null) {
            return;
        }
        PermissionRequest r = pendingWebMic;
        pendingWebMic = null;
        if (hasMic()) {
            r.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            r.deny();
        }
    }

    /* ---------------- speech recognition (the phone's own engine) ---------------- */

    private void probeRecognizer() {
        try {
            sttOk = SpeechRecognizer.isRecognitionAvailable(this);
            if (!sttOk) {
                return;
            }
            // Ask the recogniser which languages it knows; switch the feature off if Kazakh is not listed.
            Intent details = new Intent(RecognizerIntent.ACTION_GET_LANGUAGE_DETAILS);
            sendOrderedBroadcast(details, null, new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    Bundle extras = getResultExtras(true);
                    ArrayList<String> langs = extras.getStringArrayList(RecognizerIntent.EXTRA_SUPPORTED_LANGUAGES);
                    if (langs == null || langs.isEmpty()) {
                        return; // unknown: stay optimistic, a failed attempt reports itself
                    }
                    boolean kk = false;
                    for (String l : langs) {
                        if (l != null && l.toLowerCase(Locale.ROOT).startsWith("kk")) {
                            kk = true;
                        }
                    }
                    sttOk = kk;
                }
            }, null, Activity.RESULT_OK, null, null);
        } catch (Exception e) {
            sttOk = false;
        }
    }

    private void startRecognizer(String lang) {
        if (!hasMic()) {
            askMic();
            sttReply(false, null, null, "denied");
            return;
        }
        try {
            if (recognizer == null) {
                recognizer = SpeechRecognizer.createSpeechRecognizer(this);
                recognizer.setRecognitionListener(new Listener());
            }
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
            i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            recognizer.startListening(i);
        } catch (Exception e) {
            sttReply(false, null, null, "android");
        }
    }

    private void sttReply(boolean ok, ArrayList<String> texts, float[] conf, String error) {
        try {
            JSONObject o = new JSONObject();
            o.put("ok", ok);
            if (texts != null) {
                o.put("texts", new JSONArray(texts));
            }
            if (conf != null) {
                JSONArray c = new JSONArray();
                for (float f : conf) {
                    c.put((double) f);
                }
                o.put("conf", c);
            }
            if (error != null) {
                o.put("error", error);
            }
            web.evaluateJavascript("window.qStt && window.qStt(" + o.toString() + ")", null);
        } catch (Exception ignored) {
            // nothing to report to
        }
    }

    private class Listener implements RecognitionListener {
        @Override
        public void onResults(Bundle results) {
            ArrayList<String> texts = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            float[] conf = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
            if (texts == null || texts.isEmpty()) {
                sttReply(false, null, null, "silence");
            } else {
                sttReply(true, texts, conf, null);
            }
        }

        @Override
        public void onError(int error) {
            String code = "android";
            if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                code = "silence";
            } else if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                code = "denied";
            } else if (error == 12 || error == 13) { // language not supported / unavailable (API 31+)
                sttOk = false;
            }
            sttReply(false, null, null, code);
        }

        @Override public void onReadyForSpeech(Bundle params) { }
        @Override public void onBeginningOfSpeech() { }
        @Override public void onRmsChanged(float rmsdB) { }
        @Override public void onBufferReceived(byte[] buffer) { }
        @Override public void onEndOfSpeech() { }
        @Override public void onPartialResults(Bundle partialResults) { }
        @Override public void onEvent(int eventType, Bundle params) { }
    }

    /* ---------------- JS bridge ---------------- */

    private class Bridge {
        @JavascriptInterface
        public String ttsState() {
            return ttsState;
        }

        @JavascriptInterface
        public void speak(String text) {
            if (tts != null && "kk".equals(ttsState) && text != null) {
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "q");
            }
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    v.vibrate(Math.max(1, Math.min(ms, 500)));
                }
            } catch (Exception ignored) {
                // no haptics on this device
            }
        }

        @JavascriptInterface
        public boolean sttAvailable() {
            return sttOk;
        }

        @JavascriptInterface
        public void sttStart(final String lang) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    startRecognizer(lang == null ? "kk-KZ" : lang);
                }
            });
        }

        @JavascriptInterface
        public void openTtsSettings() {
            try {
                Intent i = new Intent("com.android.settings.TTS_SETTINGS");
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Exception e) {
                try {
                    startActivity(new Intent(android.provider.Settings.ACTION_SETTINGS));
                } catch (Exception ignored) {
                    // nothing else to try
                }
            }
        }
    }

    /* ---------------- lifecycle ---------------- */

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("window.qBack && window.qBack()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String handled) {
                if (!"true".equals(handled)) {
                    finish();
                }
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        if (tts != null && !"init".equals(ttsState) && !"kk".equals(ttsState)) {
            checkKazakh();
            web.evaluateJavascript("window.qResume && window.qResume()", null);
        }
    }

    @Override
    protected void onPause() {
        web.onPause();
        if (tts != null) {
            tts.stop();
        }
        if (recognizer != null) {
            try {
                recognizer.cancel();
            } catch (Exception ignored) {
                // already stopped
            }
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.shutdown();
            tts = null;
        }
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
        web.destroy();
        super.onDestroy();
    }
}
