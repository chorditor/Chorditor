// [PERF 임시 계측] 노트 화면(user_project.html) 렌더링 성능 측정 — 최적화 끝나면 이 파일과 user_project.html의 <script> 한 줄을 삭제.
// user_project.js는 건드리지 않고, 전역 함수(renderProjectView·saveAllLines)와 VoicingCanvas.draw·toDataURL을 감싸서 잰다.
//
// 측정 항목
//  · render : renderProjectView 1회(4/8슬롯 정정 재렌더 포함) 총 시간 / 그 안의 코드 그리기(draw)·PNG 변환(png) 합계 /
//             렌더 끝 → 실제 화면 그려질 때까지(paint, 이미지 디코딩·레이아웃·페인트)
//  · boot   : 페이지 로드 시작 → DOMContentLoaded / 첫 렌더 끝 / 첫 화면 표시, 진입 2초 동안 프레임 끊김(최대 프레임 간격·50ms 넘는 프레임 수)
//  · save   : saveAllLines 1회(로컬 저장 + DB 업로드 준비까지 동기 구간)
//  · collapse : (스플릿) 좌측 목록 접기/펼치기 애니메이션 동안 프레임 끊김
//
// 전후 비교: 결과는 localStorage 'np_perf_log'에 PERF_TAG와 함께 쌓인다. 최적화 단계마다 PERF_TAG를 바꿔서 같은 노트로 다시 재고,
// 콘솔에서 perfReport() → 'before' 대비 몇 % 빨라졌는지 같은 노트(줄 수·슬롯 수·모드가 같은 것)끼리 비교해 표로 보여 준다.
// perfClear() = 기록 비우기.
(() => {
  const PERF_TAG = 'after3';           // 최적화 단계 표시 — 'before' → 'after1' → 'after2' …
  const LOG_KEY  = 'np_perf_log';
  const LOG_MAX  = 300;
  const T0 = performance.now();
  const ms = v => Math.round(v * 10) / 10;

  function store(rec) {
    rec.tag = PERF_TAG;
    rec.at  = Date.now();
    try {
      const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      log.push(rec);
      while (log.length > LOG_MAX) log.shift();
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch (_) {}
  }

  // 화면에 실제로 그려진 시점 근사: 다음 프레임(rAF) 직후 태스크
  function afterPaint(cb) { requestAnimationFrame(() => setTimeout(cb, 0)); }

  // 프레임 끊김 감시 — dur(ms) 동안 rAF 간격 기록
  function watchFrames(dur, done) {
    let last = performance.now(), maxGap = 0, long = 0, frames = 0;
    const end = last + dur;
    const tick = now => {
      const gap = now - last; last = now; frames++;
      if (gap > maxGap) maxGap = gap;
      if (gap > 50) long++;
      if (now < end) requestAnimationFrame(tick);
      else done({ maxGap: ms(maxGap), longFrames: long, frames });
    };
    requestAnimationFrame(tick);
  }

  // ── 렌더 계측 ──
  let depth = 0, cur = null, firstRender = true;
  const bootFrames = new Promise(res => watchFrames(2000, res));

  const _draw = VoicingCanvas.draw;
  VoicingCanvas.draw = function () {
    if (!cur) return _draw.apply(this, arguments);
    const t = performance.now();
    try { return _draw.apply(this, arguments); }
    finally { cur.draw += performance.now() - t; cur.drawN++; }
  };
  const _toDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function () {
    if (!cur) return _toDataURL.apply(this, arguments);
    const t = performance.now();
    try { return _toDataURL.apply(this, arguments); }
    finally { cur.png += performance.now() - t; cur.pngN++; }
  };

  const _render = window.renderProjectView;
  window.renderProjectView = function (projectId) {
    if (depth > 0) { cur.passes++; depth++; try { return _render.apply(this, arguments); } finally { depth--; } }
    cur = { draw: 0, drawN: 0, png: 0, pngN: 0, passes: 1 };
    depth = 1;
    const t = performance.now();
    try { return _render.apply(this, arguments); }
    finally {
      depth = 0;
      const end = performance.now();
      const c = cur; cur = null;
      const p = getProject(projectId);
      const lines = p?.arrangement?.length || 0;
      const slots = (p?.arrangement || []).reduce((n, r) => n + (r.slots || []).filter(Boolean).length, 0);
      const mode  = (isEditMode ? '편집' : '보기') + (p?.slotsHidden ? '/텍스트' : '');
      const key   = `${p?.name || projectId} · ${lines}줄 · 슬롯${slots} · ${mode}`;
      const isBoot = firstRender; firstRender = false;
      afterPaint(() => {
        const rec = {
          kind: 'render', key, lines, slots, mode, passes: c.passes,
          total: ms(end - t), draw: ms(c.draw), drawN: c.drawN, png: ms(c.png), pngN: c.pngN,
          paint: ms(performance.now() - end), boot: isBoot,
        };
        store(rec);
        console.log(`[PERF:${PERF_TAG}] render ${key} | 총 ${rec.total}ms (그리기 ${rec.draw}ms×${rec.drawN}, PNG ${rec.png}ms×${rec.pngN}, 렌더 ${rec.passes}회) | 화면표시까지 +${rec.paint}ms`);
        if (isBoot) {
          const nav = performance.getEntriesByType('navigation')[0];
          bootFrames.then(f => {
            const b = {
              kind: 'boot', key,
              dcl: ms(nav ? nav.domContentLoadedEventEnd : 0),
              renderEnd: ms(end), shown: ms(end + rec.paint), ...f,
            };
            store(b);
            console.log(`[PERF:${PERF_TAG}] boot ${key} | DOMContentLoaded ${b.dcl}ms · 첫 렌더 끝 ${b.renderEnd}ms · 화면표시 ${b.shown}ms | 진입 2초 최대 프레임 간격 ${b.maxGap}ms, 50ms 넘는 프레임 ${b.longFrames}개`);
          });
        }
      });
    }
  };

  // ── 저장 계측 ──
  const _save = window.saveAllLines;
  window.saveAllLines = function (projectId) {
    const t = performance.now();
    try { return _save.apply(this, arguments); }
    finally {
      const d = performance.now() - t;
      const p = getProject(projectId);
      let bytes = 0; try { bytes = (localStorage.getItem('chorditor_projects') || '').length; } catch (_) {}
      const rec = { kind: 'save', key: `${p?.name || projectId} · ${p?.arrangement?.length || 0}줄`, total: ms(d), storeKB: Math.round(bytes / 1024) };
      store(rec);
      console.log(`[PERF:${PERF_TAG}] save ${rec.key} | ${rec.total}ms (전체 저장소 ${rec.storeKB}KB)`);
    }
  };

  // ── 스플릿 접기/펼치기 애니메이션 끊김 (임베드에서만 메시지가 온다) ──
  window.addEventListener('message', e => {
    if (e.source !== window.parent || e.data?.type !== 'notes-split-collapsed') return;
    if (performance.now() - T0 < 1500) return; // 로드 직후 상태 전달 메시지는 제외
    const p = typeof currentProjectId !== 'undefined' ? getProject(currentProjectId) : null;
    const key = `${p?.name || '-'} · ${p?.arrangement?.length || 0}줄 · ${e.data.collapsed ? '접기' : '펼치기'}`;
    watchFrames(500, f => {
      const rec = { kind: 'collapse', key, ...f };
      store(rec);
      console.log(`[PERF:${PERF_TAG}] collapse ${key} | 최대 프레임 간격 ${f.maxGap}ms, 50ms 넘는 프레임 ${f.longFrames}개, 프레임 ${f.frames}개/0.5초`);
    });
  });

  // ── 리포트 ──
  const avg = (a, f) => a.length ? ms(a.reduce((s, r) => s + (r[f] || 0), 0) / a.length) : null;
  const pct = (b, a) => (b && a != null) ? `${Math.round((1 - a / b) * 100)}%` : '';
  window.perfReport = function () {
    let log = [];
    try { log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (_) {}
    const fields = { render: ['total', 'draw', 'png', 'paint'], boot: ['renderEnd', 'shown', 'maxGap', 'longFrames'], save: ['total'], collapse: ['maxGap', 'longFrames'] };
    Object.keys(fields).forEach(kind => {
      const recs = log.filter(r => r.kind === kind);
      if (!recs.length) return;
      const rows = [];
      [...new Set(recs.map(r => r.key))].forEach(key => {
        const byTag = {};
        recs.filter(r => r.key === key).forEach(r => (byTag[r.tag] ||= []).push(r));
        const base = byTag.before;
        Object.keys(byTag).forEach(tag => {
          const row = { 대상: key, 단계: tag, 횟수: byTag[tag].length };
          fields[kind].forEach(f => {
            const v = avg(byTag[tag], f);
            row[f] = v;
            if (tag !== 'before' && base) row[f + ' 단축'] = pct(avg(base, f), v);
          });
          rows.push(row);
        });
      });
      console.log(`── ${kind} (평균 ms, '단축' = before 대비 줄어든 비율) ──`);
      console.table(rows);
    });
  };
  window.perfClear = function () { try { localStorage.removeItem(LOG_KEY); } catch (_) {} console.log('[PERF] 기록 삭제'); };
})();
