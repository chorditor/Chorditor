// ═══════════════════════════════════════════════════════════════
// Chorditor Analytics SDK
// 사용자 행동 이벤트 수집 → Supabase 배치 전송
//
// 사용법: window.analytics (app.js에서 초기화)
//   analytics.track('event_name', { key: value })
//   analytics.setScreen('editor')
//   analytics.assignABVariant('experiment_id')
// ═══════════════════════════════════════════════════════════════

class AnalyticsSDK {
  // ── 이벤트 카테고리 맵 ──────────────────────────────────────
  static CATEGORY_MAP = {
    // editor
    chord_build:          'editor',
    chord_applied:        'editor',
    chord_played:         'editor',
    image_saved:          'editor',
    // library
    library_opened:       'library',
    lib_tab_changed:      'library',
    lib_searched:         'library',
    lib_chord_selected:   'library',
    lib_chord_imported:   'library',
    // project
    project_created:      'project',
    project_opened:       'project',
    project_limit_hit:    'project',
    chord_added:          'project',
    // share
    share_initiated:      'share',
    import_completed:     'share',
    // subscription
    paywall_viewed:          'subscription',
    plan_upgrade_started:    'subscription',
    plan_upgrade_completed:  'subscription',
    plan_upgrade_cancelled:  'subscription',
    purchase_restored:       'subscription',
    // auth
    sign_in:          'auth',
    sign_out:         'auth',
    sign_up:          'auth',
    login_started:    'auth',
    onboarding_viewed:'auth',
    // session
    app_open:       'session',
    app_background: 'session',
    screen_view:    'session',
  };

  // ── 세션 만료 기준 ────────────────────────────────────────
  static SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분

  // ── 생성자 ─────────────────────────────────────────────────
  constructor({ supabaseUrl, supabaseAnonKey, appVersion, debug = false }) {
    this._url        = supabaseUrl;
    this._anonKey    = supabaseAnonKey;
    this._appVersion = appVersion;
    this._debug      = debug;

    this._anonId       = this._getOrCreateAnonId();
    this._sessionId    = this._uuidv4();
    this._screen       = null;
    this._queue        = [];
    this._abCache      = {};
    this._isFlushing   = false;
    this._userId       = null;
    this._lastActiveAt = Date.now(); // 마지막 활동 시각

    this._setupLifecycleListeners();
    this._startFlushInterval();

    if (this._debug) console.log('[Analytics] SDK 초기화', { anonId: this._anonId, sessionId: this._sessionId });
  }

  // ── 공개 API ───────────────────────────────────────────────

  /**
   * 이벤트 추적
   * @param {string} eventName  - 이벤트 이름 (예: 'chord_applied')
   * @param {object} properties - 이벤트 속성 (예: { chord_name: 'Am' })
   */
  track(eventName, properties = {}) {
    try {
      // 30분 비활동 시 새 세션 발급 (로그인 상태와 무관)
      const now = Date.now();
      if (now - this._lastActiveAt > AnalyticsSDK.SESSION_TIMEOUT_MS) {
        this._sessionId = this._uuidv4();
        if (this._debug) console.log('[Analytics] 세션 만료 → 새 세션:', this._sessionId);
      }
      this._lastActiveAt = now;

      const event = {
        anon_id:        this._anonId,
        session_id:     this._sessionId,
        event_name:     eventName,
        event_category: AnalyticsSDK.CATEGORY_MAP[eventName] || 'other',
        properties:     properties,
        ab_variants:    { ...this._abCache },
        screen:         this._screen,
        plan:           this._getCurrentPlan(),
        app_version:    this._appVersion,
        created_at:     new Date().toISOString(),
      };

      // 로그인 유저 ID 첨부
      const uid = this._getUserId();
      if (uid) event.user_id = uid;

      this._queue.push(event);
      if (this._debug) console.log('[Analytics] track:', eventName, properties);

      // 큐가 20개 이상이면 즉시 플러시
      if (this._queue.length >= 20) this._flush();
    } catch (e) {
      // 분석 오류가 앱 동작에 영향을 주면 안 됨
      if (this._debug) console.warn('[Analytics] track 오류:', e);
    }
  }

  /**
   * 현재 화면 설정 (이후 이벤트에 자동 첨부)
   * @param {string} screenName - 화면 이름 ('editor'/'library'/'project')
   */
  setScreen(screenName) {
    this._screen = screenName;
  }

  /**
   * 로그인 시 user_id 직접 주입 — localStorage 파싱보다 신뢰성 높음
   * app.js의 onAuthStateChange에서 호출
   * @param {string} uid - Supabase user.id
   */
  setUserId(uid) {
    this._userId = uid || null;
    if (this._debug) console.log('[Analytics] userId 설정:', this._userId);
  }

  /**
   * 로그아웃 시 user_id 초기화
   */
  clearUserId() {
    this._userId = null;
    if (this._debug) console.log('[Analytics] userId 초기화');
  }

  /**
   * A/B 실험 변형 배정 (최초 1회, 이후 캐시 반환)
   * @param {string} experimentId - 실험 ID
   * @returns {string} variant - 배정된 변형 이름
   */
  async assignABVariant(experimentId) {
    // 이미 배정된 경우 캐시 반환
    const STORAGE_KEY = `chorditor_ab_${experimentId}`;
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      this._abCache[experimentId] = cached;
      return cached;
    }

    try {
      // 실험 정보 조회
      const res = await fetch(
        `${this._url}/rest/v1/ab_experiments?id=eq.${experimentId}&select=variants,traffic_pct,status`,
        { headers: this._headers() }
      );
      const data = await res.json();
      if (!data?.length || data[0].status !== 'running') return 'control';

      const { variants, traffic_pct } = data[0];

      // traffic_pct 미만의 사용자만 실험 참여
      if (Math.random() * 100 > traffic_pct) {
        const variant = 'excluded';
        localStorage.setItem(STORAGE_KEY, variant);
        this._abCache[experimentId] = variant;
        return variant;
      }

      // 무작위 변형 배정
      const variant = variants[Math.floor(Math.random() * variants.length)];
      localStorage.setItem(STORAGE_KEY, variant);
      this._abCache[experimentId] = variant;

      // Supabase에 배정 기록 (비동기, 오류 무시)
      this._recordABAssignment(experimentId, variant).catch(() => {});

      return variant;
    } catch (e) {
      if (this._debug) console.warn('[Analytics] A/B 배정 오류:', e);
      return 'control';
    }
  }

  // ── 내부 메서드 ────────────────────────────────────────────

  _getOrCreateAnonId() {
    const KEY = 'chorditor_anon_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = this._uuidv4();
      localStorage.setItem(KEY, id);
    }
    return id;
  }

  _uuidv4() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  _getCurrentPlan() {
    try { return localStorage.getItem('chorditor_plan') || 'free'; }
    catch { return null; }
  }

  _getUserId() {
    // 1순위: app.js가 직접 주입한 값 (가장 신뢰)
    if (this._userId) return this._userId;

    // 2순위: localStorage 폴백 (이전 버전 호환용)
    try {
      const keys = Object.keys(localStorage).filter(k =>
        k.includes('auth-token') || k.includes('supabase') || k.startsWith('sb-')
      );
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        // supabase-js v2: { user: { id } } 또는 { access_token, user }
        const uid = parsed?.user?.id || parsed?.data?.user?.id;
        if (uid) return uid;
      }
    } catch {}
    return null;
  }

  _headers() {
    return {
      'Content-Type':  'application/json',
      'apikey':        this._anonKey,
      'Authorization': `Bearer ${this._anonKey}`,
    };
  }

  async _flush(sync = false) {
    if (this._queue.length === 0) return;
    if (this._isFlushing && !sync) return;

    this._isFlushing = true;
    const batch = this._queue.splice(0);

    try {
      const res = await fetch(`${this._url}/rest/v1/rpc/insert_analytics_batch`, {
        method:  'POST',
        headers: this._headers(),
        body:    JSON.stringify({ events: batch }),
        // pagehide 이벤트에서 keepalive로 백그라운드 전송
        keepalive: sync,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (this._debug) console.log(`[Analytics] ${batch.length}개 이벤트 전송 완료`);
    } catch (e) {
      // 전송 실패 시 큐 앞에 복구 (최대 50개 보존)
      const recovered = [...batch, ...this._queue].slice(0, 50);
      this._queue.length = 0;
      this._queue.push(...recovered);
      if (this._debug) console.warn('[Analytics] 전송 실패, 큐 복구:', e.message);
    } finally {
      this._isFlushing = false;
    }
  }

  _startFlushInterval() {
    // 8초마다 배치 전송
    setInterval(() => this._flush(), 8000);
  }

  _setupLifecycleListeners() {
    // 세션 만료 시간(30분)과 동일한 기준으로 app_background 기록
    // 30분 미만 이탈 후 복귀는 노이즈로 간주하여 기록하지 않음
    let _bgTimer = null;
    let _bgAt    = null; // 백그라운드 진입 시각

    const onBackground = () => {
      if (_bgTimer) clearTimeout(_bgTimer); // 중복 호출 방지
      _bgAt    = Date.now();
      _bgTimer = setTimeout(() => {
        this.track('app_background', {});
        this._flush(true);
        _bgTimer = null;
      }, AnalyticsSDK.SESSION_TIMEOUT_MS);
      this._flush(true); // 이벤트 큐는 즉시 전송
    };

    const onForeground = () => {
      if (_bgTimer) {
        clearTimeout(_bgTimer);
        _bgTimer = null;
      }
      // 복귀 시 마지막 활동 시각 갱신 (track() 내부 세션 만료 체크용)
      if (_bgAt) {
        this._lastActiveAt = Date.now();
        _bgAt = null;
      }
    };

    const isNative = window.Capacitor?.isNativePlatform();

    // Android: Capacitor 리스너만 사용 (visibilitychange 중복 방지)
    if (isNative && window.Capacitor?.Plugins?.App) {
      window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
        isActive ? onForeground() : onBackground();
      });
    } else {
      // 웹: visibilitychange 사용
      document.addEventListener('visibilitychange', () => {
        document.visibilityState === 'hidden' ? onBackground() : onForeground();
      });
    }

    window.addEventListener('pagehide', () => this._flush(true));
  }

  async _recordABAssignment(experimentId, variant) {
    const body = {
      experiment_id: experimentId,
      anon_id:       this._anonId,
      variant,
    };
    const uid = this._getUserId();
    if (uid) body.user_id = uid;

    await fetch(`${this._url}/rest/v1/ab_assignments`, {
      method:  'POST',
      headers: { ...this._headers(), 'Prefer': 'resolution=ignore-duplicates' },
      body:    JSON.stringify(body),
    });
  }
}

// ── 전역 인스턴스는 app.js에서 생성 ──
// window.analytics = new AnalyticsSDK({ ... })
