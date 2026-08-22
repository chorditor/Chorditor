package com.chorditor.app;

import android.content.Context;
import android.media.AudioManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// getUserMedia로 마이크를 열면 Chromium이 AudioManager를 통화모드(MODE_IN_COMMUNICATION)로
// 바꿔버려서 볼륨 슬라이더가 미디어음량이 아닌 통화음량으로 뜨는 문제 보정용.
// 마이크 연결 성공 직후 JS에서 이 플러그인을 호출해 강제로 일반모드로 되돌린다.
@CapacitorPlugin(name = "AudioMode")
public class AudioModePlugin extends Plugin {

    @PluginMethod
    public void setNormal(PluginCall call) {
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (am != null) {
            am.setMode(AudioManager.MODE_NORMAL);
        }
        call.resolve();
    }
}
