const chokidar = require('chokidar');
const { exec } = require('child_process');

console.log('파일 감시 시작... (index.html, onboarding.html, home.html, shared.js, onboarding.js, home.js, analytics-sdk.js, style.css, image/)');

const watcher = chokidar.watch([
  'index.html',
  'onboarding.html',
  'onboarding.js',
  'home.html',
  'home.js',
  'shared.js',
  'analytics-sdk.js',
  'style.css',
  'image'
], {
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', (path) => {
  console.log(`변경 감지: ${path}`);
  console.log('Android 동기화 중...');

  exec(
    'xcopy index.html www\\ /Y && ' +
    'xcopy onboarding.html www\\ /Y && ' +
    'xcopy onboarding.js www\\ /Y && ' +
    'xcopy home.html www\\ /Y && ' +
    'xcopy home.js www\\ /Y && ' +
    'xcopy shared.js www\\ /Y && ' +
    'xcopy analytics-sdk.js www\\ /Y && ' +
    'xcopy style.css www\\ /Y && ' +
    'xcopy image www\\image\\ /E /Y && ' +
    'npx cap sync android',
    (err, stdout, stderr) => {
      if (err) {
        console.error('오류:', err);
        return;
      }
      console.log('동기화 완료! ✅');
    }
  );
});

// cmd 실행 : node watch.js
