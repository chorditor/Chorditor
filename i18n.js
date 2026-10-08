// ─── i18n: 언어 결정·전환 + 화면 치환 ───────────────────────────
// 모든 페이지의 <head>에서 가장 먼저 로드. 용어 기준은 docs/glossary.md.
//
// 방식: 코드의 한국어 문자열은 그대로 두고, 화면(DOM)에 한국어가 나타나는 순간
// 사전(locales/<lang>/*.js)에서 찾아 바꾼다. 한국어 원문이 곧 사전의 열쇠다.
// 한국어(ko)일 때는 아무것도 실행하지 않는다.
//
// DOM을 거치지 않는 문자열(alert·confirm·캔버스·네이티브 공유 등)과, DOM 글자를
// 로직에서 비교하는 곳은 I18N.t('한국어 원문')으로 직접 감싼다.

// 설정 > 언어에 노출되는 목록. 번역이 준비된 언어만 넣을 것.
const I18N_LANGS = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'es', name: 'Español' },
];
const I18N_STORAGE_KEY = 'app_lang';
const I18N_FALLBACK    = 'en'; // 지원하지 않는 기기 언어
// locales/<lang>/ 아래 사전 파일 이름(확장자 제외). 파일을 추가하면 여기에도 추가.
const I18N_PARTS = ['common', 'home', 'onboarding', 'training', 'scale', 'mission', 'tutorial', 'project'];

function _i18nSupported(code) {
  return I18N_LANGS.some(l => l.code === code);
}

// 저장된 사용자 선택 → 기기(OS) 언어 → 영어
function getLang() {
  const saved = localStorage.getItem(I18N_STORAGE_KEY);
  if (saved && _i18nSupported(saved)) return saved;
  const device = (navigator.language || '').slice(0, 2).toLowerCase();
  if (_i18nSupported(device)) return device;
  return I18N_FALLBACK;
}

// 저장 후 새로고침(동적으로 만든 DOM까지 한 번에 바뀌도록)
function setLang(code) {
  if (!_i18nSupported(code)) return;
  localStorage.setItem(I18N_STORAGE_KEY, code);
  location.reload();
}

const I18N = (() => {
  const lang    = getLang();
  const active  = lang !== 'ko';
  const HANGUL  = /[가-힣ㄱ-ㆎ]/;
  const ATTRS   = ['placeholder', 'title', 'aria-label', 'alt'];
  const SKIP    = 'script,style,textarea,[contenteditable],[data-no-i18n]'; // 사용자 입력·코드 영역은 건드리지 않음
  const exact    = new Map(); // '한국어 원문' → '번역'
  const mixed    = new Map(); // 태그로 쪼개진 문장: 부모 요소의 전체 글자 → '<1>..</1>' 템플릿
  const patterns = [];        // 변수가 낀 문구: [정규식, '번역 {1}' 또는 (m) => '번역']
  const scoped   = [];        // 같은 원문을 자리에 따라 다르게: [CSS 선택자, { '한국어': '번역' }]
  const missing  = new Set(); // 번역이 없어 한국어로 남은 문구(개발 확인용)
  let _warnTimer = null;

  const norm = s => s.replace(/\s+/g, ' ').trim();

  // 사전 파일이 호출:
  // I18N.add('en', { exact: {...}, mixed: {...}, patterns: [[/re/, '..{1}..'], ...], scoped: [['.sel', {...}], ...] })
  function add(code, part) {
    if (!active || code !== lang) return;
    for (const k in (part.exact || {})) exact.set(norm(k), part.exact[k]);
    for (const k in (part.mixed || {})) mixed.set(norm(k), part.mixed[k]);
    (part.patterns || []).forEach(p => patterns.push(p));
    (part.scoped || []).forEach(([sel, map]) => {
      const m = new Map();
      for (const k in map) m.set(norm(k), map[k]);
      scoped.push([sel, m]);
    });
  }

  // 긴 문구 묶음용: 원문 데이터와 같은 모양(키·순서)의 번역본을 짝지어 등록.
  // 사전 파일은 번역본을 I18N.data.<이름> 에 두고, 원문을 가진 파일이 addPairs(원문, 번역본)을 호출.
  const data = {};
  function addPairs(ko, tr) {
    if (!active || ko == null || tr == null) return;
    if (typeof ko === 'string') {
      if (typeof tr === 'string') exact.set(norm(ko), tr);
      return;
    }
    if (typeof ko === 'object') {
      for (const k in ko) addPairs(ko[k], tr[k]);
    }
  }

  // el: 문구가 놓인 요소(자리별 번역 판정용, 없어도 됨)
  function lookup(key, el) {
    if (el && scoped.length) {
      for (const [sel, map] of scoped) {
        if (map.has(key) && el.closest(sel)) return map.get(key);
      }
    }
    if (exact.has(key)) return exact.get(key);
    for (const [re, tpl] of patterns) {
      const m = re.exec(key);
      if (!m) continue;
      if (typeof tpl === 'function') return tpl(m);
      // {n} 자리에 들어가는 값도 사전에 있으면 번역(레벨 이름·날짜 등)
      return tpl.replace(/\{(\d)\}/g, (_, i) => t(m[i] == null ? '' : m[i]));
    }
    return null;
  }

  function _miss(key) {
    if (missing.has(key)) return;
    missing.add(key);
    if (typeof APP_VERSION === 'undefined' || !APP_VERSION.includes('_dev')) return;
    clearTimeout(_warnTimer);
    _warnTimer = setTimeout(() => console.warn('[i18n] 번역 없는 문구 ' + missing.size + '개 — I18N.missing 로 확인'), 2000);
  }

  // 한국어 원문 → 현재 언어. 번역이 없으면 원문 그대로.
  function t(s) {
    if (!active || s == null) return s;
    s = String(s);
    if (!HANGUL.test(s)) return s;
    const key = norm(s);
    const r = lookup(key);
    if (r == null) { _miss(key); return s; }
    return r;
  }

  function _skip(el) {
    return !el || el.nodeType !== 1 || !!el.closest(SKIP);
  }

  // 태그로 쪼개진 문장을 부모 단위로 번역. 템플릿의 <n>글자</n>·<n/>는 n번째 자식 요소.
  // 열쇠는 자식 요소 자리에 <태그>를 적은 원문(예: '코드 <br>맞추기') — 글자가 같아도 구조가 다르면 안 걸린다.
  function _trMixed(p) {
    if (!mixed.size || !p.children || p.children.length === 0 || p.children.length > 8) return false;
    let sig = '';
    for (const c of p.childNodes) {
      if (c.nodeType === 3) sig += c.nodeValue;
      else if (c.nodeType === 1) sig += '<' + c.tagName.toLowerCase() + '>' + c.textContent;
      if (sig.length > 400) return false;
    }
    const tpl = mixed.get(norm(sig));
    if (tpl == null) return false;
    const kids = Array.from(p.children);
    const used = new Set();
    const frag = document.createDocumentFragment();
    const re = /<(\d+)>([\s\S]*?)<\/\1>|<(\d+)\/>/g;
    let last = 0, m;
    while ((m = re.exec(tpl))) {
      if (m.index > last) frag.appendChild(document.createTextNode(tpl.slice(last, m.index)));
      const idx = parseInt(m[1] || m[3], 10) - 1;
      const kid = kids[idx];
      if (kid) {
        if (m[1]) kid.textContent = m[2];
        frag.appendChild(kid);
        used.add(idx);
      }
      last = re.lastIndex;
    }
    if (last < tpl.length) frag.appendChild(document.createTextNode(tpl.slice(last)));
    kids.forEach((k, i) => { if (!used.has(i)) frag.appendChild(k); });
    while (p.firstChild) p.removeChild(p.firstChild);
    p.appendChild(frag);
    return true;
  }

  function _trText(node) {
    const v = node.nodeValue;
    if (!v || !HANGUL.test(v)) return;
    const p = node.parentNode;
    if (_skip(p)) return;
    // 문장 단위 번역(mixed)이 있으면 그쪽이 우선 — 조각만 따로 번역되면 어순이 깨진다
    if (_trMixed(p)) return;
    const key = norm(v);
    const r = lookup(key, p);
    if (r != null) {
      node.nodeValue = v.match(/^\s*/)[0] + r + v.match(/\s*$/)[0];
      return;
    }
    _miss(key);
  }

  function _trAttrs(el) {
    if (el.nodeType !== 1 || el.closest('[data-no-i18n]')) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v || !HANGUL.test(v)) continue;
      const r = lookup(norm(v), el);
      if (r != null) el.setAttribute(a, r); else _miss(norm(v));
    }
  }

  function _walk(root) {
    if (root.nodeType === 3) { _trText(root); return; }
    if (root.nodeType !== 1) return;
    _trAttrs(root);
    root.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(_trAttrs);
    if (root.closest(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(_trText); // 모은 뒤 처리(_trMixed가 트리를 바꾸므로)
  }

  if (active) {
    I18N_PARTS.forEach(name => {
      document.write('<script src="locales/' + lang + '/' + name + '.js"><\/script>');
    });
    // 파서가 요소를 붙이는 즉시(페인트 전) 치환 → 한국어가 깜빡 보이지 않음
    new MutationObserver(recs => {
      for (const r of recs) {
        if (r.type === 'characterData') _trText(r.target);
        else if (r.type === 'attributes') _trAttrs(r.target);
        else r.addedNodes.forEach(_walk);
      }
    }).observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
    // alert·confirm·prompt는 DOM을 거치지 않으므로 문구를 여기서 번역
    ['alert', 'confirm', 'prompt'].forEach(fn => {
      const orig = window[fn];
      window[fn] = function (msg, ...rest) { return orig.call(window, t(msg), ...rest); };
    });
    // 파서가 글자를 이어 붙이는 경우까지 한 번 더 훑기
    document.addEventListener('DOMContentLoaded', () => _walk(document.documentElement));
  }

  return { lang, t, add, addPairs, data, get missing() { return Array.from(missing); } };
})();

document.documentElement.lang = I18N.lang;
