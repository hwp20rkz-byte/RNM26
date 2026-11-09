package kz.qazaqsha.oyna;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.Locale;

/**
 * Full-screen WebView that runs the offline game from assets/,
 * plus a tiny JS bridge to Android's text-to-speech for the Kazakh voice.
 */
public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    private static final Locale KAZAKH = new Locale("kk", "KZ");

    private WebView web;
    private TextToSpeech tts;
    /** "init" | "kk" (Kazakh voice ready) | "nokk" (engine has no Kazakh) | "none" (no engine). */
    private volatile String ttsState = "init";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window w = getWindow();
        w.setStatusBarColor(Color.WHITE);
        if (Build.VERSION.SDK_INT >= 23) {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

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
        web.setWebViewClient(new WebViewClient() {
            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Stay inside the bundled game; never navigate to the web.
                return !url.startsWith("file:///android_asset/");
            }
        });
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");

        tts = new TextToSpeech(this, this);
    }

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
        // The child may have just installed a Kazakh voice in system settings.
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
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.shutdown();
            tts = null;
        }
        web.destroy();
        super.onDestroy();
    }
}
