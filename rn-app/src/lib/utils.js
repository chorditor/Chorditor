// ── ID 생성 ───────────────────────────────────────────────────────
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── 버전 비교: v1 < v2 → -1, v1 == v2 → 0, v1 > v2 → 1 ──────────
export function compareVersion(v1, v2) {
  const clean = v => v.replace(/_.*$/, '');
  const p1 = clean(v1).split('.').map(Number);
  const p2 = clean(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] ?? 0;
    const b = p2[i] ?? 0;
    if (a < b) return -1;
    if (a > b) return  1;
  }
  return 0;
}

// ── 빈 줄(arrangement row) 생성 ──────────────────────────────────
export function createEmptyLine() {
  return {
    id: genId(),
    text: '',
    slots: new Array(8).fill(null),
  };
}
