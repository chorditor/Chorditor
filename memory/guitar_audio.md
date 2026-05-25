# Guitar Audio 구현 기록

## 구조
- `guitar-samples.js` — E2/E3/E4/E5.mp3 Base64 인코딩 내장 (CORS 없이 file:// 동작)
- `guitar-audio.js` — Tone.js Sampler 공용 모듈 (`GuitarAudio` 전역 객체)
- `GuitarAudio.playChord(rootKey, semitones, quality)` — 코드 스트럼
- `GuitarAudio.playNote(midi, duration, delay)` — 단음 재생
- `GuitarAudio.stop()` — 현재 재생 중인 노트 즉시 중단

## 샘플 파일
E2.mp3 / E3.mp3 / E4.mp3 / E5.mp3 (직접 녹음, 루트 폴더)
재생성 명령:
```bash
cd "H:/Project/Project/Chords_editor"
python3 -c "
import base64
files = ['E2.mp3','E3.mp3','E4.mp3','E5.mp3']
lines = ['// guitar-samples.js - Base64 encoded guitar samples\n', 'const GUITAR_SAMPLES = {\n']
for f in files:
    with open(f,'rb') as fh:
        data = base64.b64encode(fh.read()).decode('ascii')
    key = f.replace('.mp3','')
    lines.append('  \"' + key + '\": \"' + data + '\",\n')
lines.append('};\n')
with open('guitar-samples.js','w', encoding='utf-8') as out:
    out.writelines(lines)
print('Done')
"
```

## 적용된 HTML
- `home.html` (코드 에디터, 코드 사전)
- `progression.html`
- `progression-detail.html`
- `scale-level.html`

## 핵심 버그 해결: 노트 끊김 안 되는 문제

### 문제
`triggerAttackRelease(note, 2.5)` 로 재생된 노트는 2.5초 릴리즈가 이미 스케줄됨.
이후 `triggerRelease()` 호출해도 스케줄된 릴리즈 취소 불가 → 소리 계속 남음.

### 해결책
`triggerAttack` 만 사용하고, 다음 노트 재생 시 `triggerRelease` 호출.

```js
// playNote 내부
if (_lastNotes.length) _sampler.triggerRelease(_lastNotes, Tone.now());
_lastNotes = [note];
_sampler.triggerAttack(note, Tone.now() + (delay ?? 0));

// stop()
_sampler.triggerRelease(_lastNotes, Tone.now());
_lastNotes = [];
```

### 스트럼 속도
`home.js`의 `STRUM_INTERVAL` 상수로 조절 (단위: 초)
- 기본값: `0.055` (55ms)
