// ═══════════════════════════════════════════════════════════════
// shuffle-bag.js — 셔플백 모듈
// ═══════════════════════════════════════════════════════════════
//
// 사용법:
//   const bag = new ShuffleBag('my-bag-key', itemsArray);
//   const item = bag.next();   // 겹치지 않게 순환 반환
//   bag.reset();               // 주머니 초기화
//
// ▶ 동작 원리
//   1. items 전체를 셔플해 주머니에 담음
//   2. next() 호출 시 앞에서 하나씩 꺼냄
//   3. 주머니가 비면 자동 재충전 + 재셔플
//   4. localStorage에 [남은 인덱스 순서]를 저장 → 앱 재시작 후에도 이어서 진행
//
// ▶ localStorage 저장 형태
//   key: 'shuffle-bag:<storageKey>'
//   value: JSON { version: 1, order: [2,5,0,3,...] }
//   order = items 배열의 인덱스 순서 (남은 것만)
//
// ═══════════════════════════════════════════════════════════════

class ShuffleBag {
  /**
   * @param {string} storageKey  localStorage 키 (고유 식별자)
   * @param {Array}  items       셔플 대상 배열 (직렬화 불필요, 인덱스만 저장)
   */
  constructor(storageKey, items) {
    this._storageKey = `shuffle-bag:${storageKey}`;
    this._items      = items;
    this._order      = [];   // 남은 인덱스 큐 (앞에서 꺼냄)

    this._load();
  }

  // ── 다음 항목 반환 ───────────────────────────────────────────
  next() {
    if (this._items.length === 0) return null;

    if (this._order.length === 0) {
      this._refill();
    }

    const idx  = this._order.shift();
    this._save();
    return this._items[idx];
  }

  // ── 강제 초기화 (키 변경 등) ─────────────────────────────────
  reset() {
    this._order = [];
    this._save();
  }

  // ── items 교체 (키/스케일 변경 시) ──────────────────────────
  setItems(items) {
    this._items = items;
    this._order = [];
    this._save();
  }

  // ── 남은 개수 ────────────────────────────────────────────────
  get remaining() { return this._order.length; }
  get total()     { return this._items.length; }

  // ── 내부: 재충전 + 셔플 ──────────────────────────────────────
  _refill() {
    // 0 ~ items.length-1 인덱스 배열 생성 후 Fisher-Yates 셔플
    const order = Array.from({ length: this._items.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    this._order = order;
  }

  // ── 내부: localStorage 저장 ──────────────────────────────────
  _save() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify({
        version: 1,
        order:   this._order,
      }));
    } catch (e) {
      // localStorage 불가 환경 (시크릿 모드 등) — 조용히 무시
    }
  }

  // ── 내부: localStorage 불러오기 ──────────────────────────────
  _load() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (!raw) return;

      const data = JSON.parse(raw);
      if (data.version !== 1) return;

      // 저장된 인덱스가 현재 items 범위 안에 있는지 검증
      const valid = data.order.every(i => Number.isInteger(i) && i >= 0 && i < this._items.length);
      if (!valid) return;

      this._order = data.order;
    } catch (e) {
      // 파싱 실패 시 무시 (자연스럽게 재충전됨)
    }
  }
}
