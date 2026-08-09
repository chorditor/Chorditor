package com.chorditor.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private String pendingCode = null;
    private OnBackPressedCallback backCallback;

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

        // 뒤로가기는 웹 쪽 handleNativeBack이 처리한다(화면의 뒤로가기 버튼과 동일 동작).
        // 웹이 처리하지 못했다고 알려오면 기본 처리로 넘긴다 — 예전엔 무조건 삼켜서,
        // handleNativeBack을 정의하지 않은 페이지에서는 뒤로가기가 완전히 먹통이었다.
        backCallback = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript(
                        "(function(){ if(typeof handleNativeBack!=='function') return false;"
                      + " handleNativeBack(); return true; })()",
                        value -> {
                            if ("true".equals(value)) return;
                            // 이 콜백을 잠시 꺼서 같은 뒤로가기를 기본 경로로 다시 흘려보낸다
                            // (캐패시터의 backButton 리스너 → 웹뷰 히스토리 → 액티비티 종료)
                            backCallback.setEnabled(false);
                            getOnBackPressedDispatcher().onBackPressed();
                            backCallback.setEnabled(true);
                        }
                );
            }
        };
        getOnBackPressedDispatcher().addCallback(this, backCallback);
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
