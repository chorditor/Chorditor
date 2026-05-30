package com.chorditor.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private String pendingCode = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SaveImagePlugin.class);
        super.onCreate(savedInstanceState);

        new android.os.Handler().post(() -> {
            android.webkit.WebView webView = getBridge().getWebView();
            if (webView != null) {
                android.webkit.WebSettings settings = webView.getSettings();
                settings.setTextZoom(90);
            }
        });

        pendingCode = extractCode(getIntent());

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript(
                        "(function(){ if(typeof handleNativeBack==='function') handleNativeBack(); })()", null
                );
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pendingCode != null) {
            final String code = pendingCode;
            pendingCode = null;
            new Handler().postDelayed(() -> deliverCode(code), 800);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String code = extractCode(intent);
        if (code != null) deliverCode(code);
    }

    private String extractCode(Intent intent) {
        if (intent == null) return null;
        Uri data = intent.getData();
        if (data == null) return null;
        if ("chorditor".equals(data.getScheme()) && "import".equals(data.getHost()))
            return data.getQueryParameter("code");
        return null;
    }

    private void deliverCode(String code) {
        String safe = code.replace("'", "\\'");
        getBridge().getWebView().evaluateJavascript("window._handleShareImport('" + safe + "')", null);
    }
}
