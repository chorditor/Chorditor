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
    chord_build:             'editor',
    chord_applied:           'editor',
    chord_played:            'editor',
    image_saved:             'editor',
    editor_reset:            'editor',
    accidental_switched:     'editor',
    chord_suggestion_tapped: 'editor',
    project_sheet_opened:    'editor',
    // library
    library_opened:            'library',
    lib_tab_changed:           'library',
    lib_searched:              'library',
    lib_chord_selected:        'library',
    lib_chord_imported:        'library',
    lib_chord_played:          'library',
    lib_image_saved:           'library',
    lib_fingering_changed:     'library',
    lib_search_result_selected:'library',
    lib_finger_num_toggled:    'library',
    // project
    project_created:          'project',
    project_opened:           'project',
    project_limit_hit:        'project',
    project_deleted:          'project',
    project_pinned:           'project',
    project_marked_important: 'project',
    chord_added:              'project',
    chord_slot_placed:        'project',
    chord_view_modal_opened:  'project',
    capo_changed:             'project',
    bpm_changed:              'project',
    metronome_toggled:        'project',
    playall_started:          'project',
    project_chord_played:     'project',
    // share
    share_initiated:      'share',
    import_completed:     'share',
    // subscription
    paywall_viewed:          'subscription',
    plan_page_viewed:        'subscription',
    plan_upgrade_started:    'subscription',
    plan_upgrade_completed:  'subscription',
    plan_upgrade_cancelled:  'subscription',
    plan_upgrade_failed:     'subscription',
    purchase_restored:       'subscription',
    billing_faq_opened:      'subscription',
    // auth
    sign_in:          'auth',
    sign_out:         'auth',
    sign_up:          'auth',
    login_started:    'auth',
    onboarding_viewed:'auth',
    // home
    home_block_tapped:   'home',
    tab_switched:        'home',
    notice_viewed:       'home',
    tutorial_viewed:     'home',
    // training
    training_page_viewed:  'training',
    training_card_tapped:  'training',
    training_attendance_achieved: 'training',
    // strumming
    strumming_training_viewed: 'strumming',
    strum_play_viewed:         'strumming',
    strum_play_started:        'strumming',
    // quiz
    quiz_page_viewed:          'quiz',
    quiz_level_started:        'quiz',
    quiz_preview_opened:       'quiz',
    quiz_chart_opened:         'quiz',
    quiz_mode_selected:        'quiz',
    quiz_answer_given:         'quiz',
    quiz_timeout:              'quiz',
    quiz_completed:            'quiz',
    quiz_new_record:           'quiz',
    quiz_attendance_achieved:  'quiz',
    quiz_retried:              'quiz',
    quiz_abandoned:            'quiz',
    // tuner
    tuner_page_viewed:    'tuner',
    tuner_preset_changed: 'tuner',
    // metronome
    metronome_page_viewed: 'metronome',
    // push
    push_opened:    'push',
    // session
    app_open:        'session',
    screen_view:     'session',
    user_engagement: 'session',
  };

  // ── 세션 만료 기준 ────────────────────────────────────────
  static SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분

  // 화면이 보이는 동안 세션을 살려두는 주기 (GA4 engagement 모델)
  // 이벤트로 기록되지 않고 _lastActiveAt 갱신만 함
  static ENGAGEMENT_HEARTBEAT_MS = 60 * 1000; // 1분

  // ── 생성자 ─────────────────────────────────────────────────
  constructor({ supabaseUrl, supabaseAnonKey, appVersion, debug = false }) {
    this._url        = supabaseUrl;
    this._anonKey    = supabaseAnonKey;
    this._appVersion = appVersion;
    this._debug      = debug;

    this._anonId       = this._getOrCreateAnonId();
    const _sess        = this._restoreOrCreateSession();
    this._sessionId    = _sess.sessionId;
    this._screen       = null;
    this._queue        = [];
    this._abCache      = {};
    this._isFlushing   = false;
    this._userId       = null;
    this._lastActiveAt = _sess.lastActiveAt; // 마지막 활동 시각 (세션 복원값)
    this._platform     = (window.Capacitor?.getPlatform?.() || 'web'); // 'android'|'ios'|'web'

    // engagement 계측 (GA4 방식): 화면이 보이는 동안의 시간을 누적해
    // 다음 이벤트의 engagement_time_msec 으로 실어 보냄
    this._engagedMs    = this._restoreEngagementMs(); // 직전 페이지에서 넘어온 잔여분 포함
    this._visibleSince = (typeof document === 'undefined' || document.visibilityState === 'visible')
      ? Date.now() : null;

    this._setupLifecycleListeners();
    this._startFlushInterval();
    this._startEngagementHeartbeat();

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
      this._persistSession(); // 페이지 이동 후에도 session_id 유지

      // app_open은 세션당 1회. 멀티페이지 앱이라 페이지 로드마다 호출되지만
      // "앱 실행" 의미를 유지하려면 세션 단위로 눌러야 한다.
      if (eventName === 'app_open' && !this._claimAppOpen()) return;

      const event = {
        anon_id:        this._anonId,
        session_id:     this._sessionId,
        event_name:     eventName,
        event_category: AnalyticsSDK.CATEGORY_MAP[eventName] || 'other',
        properties:     { ...properties, engagement_time_msec: this._takeEngagementMs() },
        ab_variants:    { ...this._abCache },
        screen:         this._screen,
        plan:           this._getCurrentPlan(),
        app_version:    this._appVersion,
        platform:       this._platform,
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
   * 큐 즉시 전송(keepalive) — 이탈 직전에 track()한 이벤트를 확실히 보내야 할 때 사용.
   * SDK 자체 pagehide/appStateChange 리스너는 먼저 등록돼 있어 나중에 큐에 들어간
   * 이벤트를 놓치므로, 그런 호출부가 직접 이 메서드를 불러 마무리한다.
   */
  flush() {
    return this._flush(true);
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

  // 세션 복원: 30분 내 활동 기록이 있으면 같은 session_id 재사용,
  // 없으면 새 세션 발급. 페이지 이동(home/training/quiz.html) 시 SDK가
  // 재생성돼도 session_id가 유지되도록 localStorage에 영속화.
  _restoreOrCreateSession() {
    const SID = 'chorditor_session_id';
    const ACT = 'chorditor_session_active';
    try {
      const sid = localStorage.getItem(SID);
      const act = parseInt(localStorage.getItem(ACT) || '0', 10);
      if (sid && act && (Date.now() - act) < AnalyticsSDK.SESSION_TIMEOUT_MS) {
        return { sessionId: sid, lastActiveAt: act };
      }
    } catch (_) {}
    const sid = this._uuidv4();
    const now = Date.now();
    try {
      localStorage.setItem(SID, sid);
      localStorage.setItem(ACT, String(now));
    } catch (_) {}
    return { sessionId: sid, lastActiveAt: now };
  }

  // 현 세션에서 app_open을 아직 안 찍었으면 선점하고 true, 이미 찍었으면 false.
  _claimAppOpen() {
    const KEY = 'chorditor_session_appopen';
    try {
      if (localStorage.getItem(KEY) === this._sessionId) return false;
      localStorage.setItem(KEY, this._sessionId);
    } catch (_) {}
    return true;
  }

  _persistSession() {
    try {
      localStorage.setItem('chorditor_session_id', this._sessionId);
      localStorage.setItem('chorditor_session_active', String(this._lastActiveAt));
    } catch (_) {}
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

  // 직전 이벤트 이후 쌓인 engaged 시간(ms)을 꺼내고 카운터를 리셋.
  // 화면이 보이는 중이면 현재 구간까지 정산한다.
  _takeEngagementMs() {
    const now = Date.now();
    if (this._visibleSince !== null) {
      this._engagedMs += now - this._visibleSince;
      this._visibleSince = now;
    }
    const ms = this._engagedMs;
    this._engagedMs = 0;
    if (ms > 0) this._persistEngagementMs(0); // 이벤트에 실렸으므로 백업분 폐기
    return ms;
  }

  // 화면 이탈 시점의 잔여 engaged 시간 처리. 독립 행을 만들지 않는다.
  // 큐에 대기 중인 이벤트가 있으면 거기에 얹고, 없으면 localStorage에 넘겨
  // 다음 페이지의 첫 이벤트가 싣고 가게 한다(멀티페이지 앱 대응).
  _flushEngagement() {
    if (this._visibleSince !== null) {
      this._engagedMs += Date.now() - this._visibleSince;
      this._visibleSince = null;
    }
    if (this._engagedMs <= 0) return;

    const last = this._queue[this._queue.length - 1];
    if (last) {
      last.properties.engagement_time_msec =
        (last.properties.engagement_time_msec || 0) + this._engagedMs;
      this._engagedMs = 0;
      this._persistEngagementMs(0);
      return;
    }
    // 실어 보낼 이벤트가 없음 → 메모리에 유지하되 페이지 파기 대비 백업
    this._persistEngagementMs(this._engagedMs);
  }

  // 페이지 이동으로 SDK가 파기돼도 잔여 engaged 시간이 살아남게 한다.
  _persistEngagementMs(ms) {
    try {
      if (ms > 0) localStorage.setItem('chorditor_engaged_ms', `${ms}|${Date.now()}`);
      else        localStorage.removeItem('chorditor_engaged_ms');
    } catch (_) {}
  }

  // 세션이 살아있는 동안 넘어온 잔여분만 이어받는다. 만료분은 버린다.
  _restoreEngagementMs() {
    try {
      const raw = localStorage.getItem('chorditor_engaged_ms');
      localStorage.removeItem('chorditor_engaged_ms');
      if (!raw) return 0;
      const [ms, at] = raw.split('|').map(Number);
      if (!ms || !at) return 0;
      if (Date.now() - at >= AnalyticsSDK.SESSION_TIMEOUT_MS) return 0;
      return ms;
    } catch (_) { return 0; }
  }

  // 화면을 보고만 있어도(이벤트 미발생) 세션이 끊기지 않도록 주기적으로
  // _lastActiveAt 만 갱신한다. 이벤트로 기록하지 않으므로 DB는 늘지 않음.
  _startEngagementHeartbeat() {
    setInterval(() => {
      if (this._visibleSince === null) return; // 백그라운드면 세션 연장 안 함
      this._lastActiveAt = Date.now();
      this._persistSession();
    }, AnalyticsSDK.ENGAGEMENT_HEARTBEAT_MS);
  }

  _setupLifecycleListeners() {
    // 이탈 시점의 잔여 engaged 시간은 행을 추가하지 않고 이월시킨다.
    const onBackground = () => {
      this._flushEngagement(); // 잔여 engaged 시간을 큐/localStorage 로 이월
      this._flush(true);       // 이벤트 큐는 즉시 전송
    };

    const onForeground = () => {
      this._visibleSince = Date.now(); // engagement 계측 재개
      // 복귀 시 마지막 활동 시각 갱신 (track() 내부 세션 만료 체크용)
      this._lastActiveAt = Date.now();
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

    // 페이지 이동(멀티페이지 앱)으로 SDK가 파기되기 전 잔여 engaged 시간 보존
    window.addEventListener('pagehide', () => {
      this._flushEngagement();
      this._flush(true);
    });
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
