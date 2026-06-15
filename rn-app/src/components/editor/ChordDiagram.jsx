import React, { useRef, useCallback } from 'react';
import { View, PanResponder, Dimensions } from 'react-native';
import Svg, { Line, Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { buildBarreMap } from '../../lib/audio';
import { STRINGS } from '../../constants/app';

const FRETS = 4;
const DIAGRAM_RATIO = 4 / 3; // width:height

// ── 다이어그램 치수 계산 ─────────────────────────────────────────
function getDimensions(width) {
  const height    = Math.round(width / DIAGRAM_RATIO);
  const marginX   = width  * 0.11;
  const marginY   = height * 0.06;
  const topOffset = height * 0.18;
  const tableL    = marginX;
  const tableR    = width - marginX;
  const tableT    = topOffset + marginY;
  const tableB    = height - marginY * 2;
  const fretW     = (tableR - tableL) / FRETS;
  const stringH   = (tableB - tableT) / (STRINGS - 1);
  const dotSize   = stringH * 0.75;
  return { width, height, tableL, tableR, tableT, tableB, fretW, stringH, dotSize, topOffset };
}

// ── 코드 다이어그램 SVG ──────────────────────────────────────────
export default function ChordDiagram({
  chord,
  width: propWidth,
  onStrumString,
  strummedStrings = [],
  onTap,
}) {
  const screenW = Dimensions.get('window').width;
  const width   = propWidth || Math.min(screenW * 0.85, 320);
  const dim     = getDimensions(width);
  const { tableL, tableR, tableT, tableB, fretW, stringH, dotSize, height, topOffset } = dim;

  // 최신 치수를 PanResponder에서 접근할 수 있도록 ref 유지
  const dimRef = useRef(dim);
  dimRef.current = dim;

  // 인터랙티브 모드 여부 (PanResponder 활성화 조건)
  const isInteractiveRef = useRef(!!(onStrumString || onTap));
  isInteractiveRef.current = !!(onStrumString || onTap);

  const barreMap = buildBarreMap(chord?.dots || [], chord?.barre || {});

  // ── 제스처 추적 ref ─────────────────────────────────────────────
  const lastStrumIdx   = useRef(-1);
  const touchStartPos  = useRef({ x: 0, y: 0 });
  const touchStartTime = useRef(0);
  const hasMoved       = useRef(false);

  const getStringIndex = useCallback((y) => {
    const { tableT: tt, stringH: sh } = dimRef.current;
    for (let s = 0; s < STRINGS; s++) {
      const sy = tt + s * sh;
      if (Math.abs(y - sy) < sh * 0.6) return s;
    }
    return -1;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isInteractiveRef.current,
      onMoveShouldSetPanResponder:  () => isInteractiveRef.current,

      onPanResponderGrant: (evt) => {
        hasMoved.current = false;
        lastStrumIdx.current = -1;
        touchStartPos.current  = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        touchStartTime.current = Date.now();
      },

      onPanResponderMove: (evt) => {
        const { x: sx, y: sy } = touchStartPos.current;
        const dx = Math.abs(evt.nativeEvent.locationX - sx);
        const dy = Math.abs(evt.nativeEvent.locationY - sy);
        if (dx > 8 || dy > 8) hasMoved.current = true;

        if (hasMoved.current) {
          const y = evt.nativeEvent.locationY;
          const s = getStringIndex(y);
          if (s !== -1 && s !== lastStrumIdx.current) {
            lastStrumIdx.current = s;
            onStrumString?.(s);
          }
        }
      },

      onPanResponderRelease: (evt) => {
        const duration = Date.now() - touchStartTime.current;
        if (!hasMoved.current && duration < 300) {
          // 탭으로 판정
          const { tableL: tl, tableR: tr, tableT: tt, tableB: tb, fretW: fw, dotSize: ds } = dimRef.current;
          const tapX = touchStartPos.current.x;
          const tapY = touchStartPos.current.y;
          const openMuteZone = tl - ds * 0.3;

          if (tapX < openMuteZone) {
            // 오픈/뮤트 영역
            const s = getStringIndex(tapY);
            if (s !== -1) onTap?.('openMute', { s });
          } else if (tapX >= tl && tapX <= tr && tapY >= tt && tapY <= tb) {
            // 프렛 그리드 영역
            const s = getStringIndex(tapY);
            const f = Math.floor((tapX - tl) / fw) + 1;
            if (s !== -1 && f >= 1 && f <= FRETS) onTap?.('dot', { s, f });
          }
        }
        hasMoved.current    = false;
        lastStrumIdx.current = -1;
      },
    })
  ).current;

  if (!chord) return null;

  // ── 바레 커버 범위 ───────────────────────────────────────────────
  const barreCount = {};
  chord.dots.forEach(d => { barreCount[d.f] = (barreCount[d.f] || 0) + 1; });
  const coveredByBarre = new Set();
  Object.keys(barreCount)
    .filter(f => barreCount[Number(f)] >= 2 && chord.barre[Number(f)])
    .forEach(f => {
      const same = chord.dots.filter(d => d.f === Number(f));
      const minS = Math.min(...same.map(d => d.s));
      const maxS = Math.max(...same.map(d => d.s));
      for (let s = minS; s <= maxS; s++) coveredByBarre.add(s);
    });

  // ── 바레 렌더 목록 ───────────────────────────────────────────────
  const barreItems = [];
  Object.keys(barreCount)
    .filter(f => barreCount[Number(f)] >= 2 && chord.barre[Number(f)])
    .map(Number)
    .forEach(f => {
      const same = chord.dots.filter(d => d.f === f);
      const minS = Math.min(...same.map(d => d.s));
      const maxS = Math.max(...same.map(d => d.s));
      barreItems.push({ f, minS, maxS });
    });

  const fretLabel = chord.fretNumber >= 2 ? String(chord.fretNumber) : '';

  return (
    <View style={{ width, height }} {...panResponder.panHandlers}>
      <Svg width={width} height={height}>

        {/* 줄 하이라이트 (스트럼 피드백) */}
        {strummedStrings.map(s => (
          <Rect
            key={`hl-${s}`}
            x={tableL}
            y={tableT + s * stringH - stringH * 0.4}
            width={tableR - tableL}
            height={stringH * 0.8}
            fill="rgba(255,200,0,0.25)"
            rx={3}
          />
        ))}

        {/* 너트 — open position(fretNumber<=1)일 때만 굵은 선 */}
        {(!chord.fretNumber || chord.fretNumber <= 1) ? (
          <Line
            x1={tableL} y1={tableT}
            x2={tableL} y2={tableB}
            stroke="#000" strokeWidth={Math.max(3, width * 0.018)}
            strokeLinecap="round"
          />
        ) : (
          <Line
            x1={tableL} y1={tableT}
            x2={tableL} y2={tableB}
            stroke="#2a2a2a" strokeWidth={Math.max(1, width * 0.004)}
          />
        )}

        {/* 프렛선 (수직) */}
        {Array.from({ length: FRETS + 1 }, (_, f) => (
          <Line
            key={`fret-${f}`}
            x1={tableL + f * fretW} y1={tableT}
            x2={tableL + f * fretW} y2={tableB}
            stroke="#2a2a2a" strokeWidth={Math.max(1, width * 0.004)}
          />
        ))}

        {/* 줄선 (수평) */}
        {Array.from({ length: STRINGS }, (_, s) => (
          <Line
            key={`string-${s}`}
            x1={tableL} y1={tableT + s * stringH}
            x2={tableR} y2={tableT + s * stringH}
            stroke="#2a2a2a" strokeWidth={Math.max(1, width * 0.004)}
          />
        ))}

        {/* 오픈/뮤트 심볼 */}
        {chord.openMute.map((v, s) => {
          if (!v) return null;                                // 심볼 없음 (운지 줄)
          if (chord.dots.some(d => d.s === s)) return null;
          if (v !== 'mute' && coveredByBarre.has(s)) return null;
          const y = tableT + s * stringH;
          const x = tableL - dotSize * 0.9;
          const r = dotSize * 0.35;
          if (v === 'mute') {
            return (
              <G key={`om-${s}`}>
                <Line x1={x-r} y1={y-r} x2={x+r} y2={y+r} stroke="#333" strokeWidth={Math.max(1.5, width*0.005)} strokeLinecap="round"/>
                <Line x1={x+r} y1={y-r} x2={x-r} y2={y+r} stroke="#333" strokeWidth={Math.max(1.5, width*0.005)} strokeLinecap="round"/>
              </G>
            );
          }
          return (
            <Circle key={`om-${s}`} cx={x} cy={y} r={r}
              stroke="#333" strokeWidth={Math.max(1.5, width*0.005)} fill="none"
            />
          );
        })}

        {/* 바레 */}
        {barreItems.map(({ f, minS, maxS }) => {
          const x  = tableL + (f - 0.5) * fretW;
          const y1 = tableT + minS * stringH;
          const y2 = tableT + maxS * stringH;
          return (
            <Rect
              key={`barre-${f}`}
              x={x - dotSize * 0.5}
              y={y1 - dotSize * 0.5}
              width={dotSize}
              height={(y2 - y1) + dotSize}
              rx={dotSize * 0.5}
              fill="#1a1714"
            />
          );
        })}

        {/* 닷 */}
        {chord.dots.map((d, i) => {
          if (chord.barre[d.f] && barreItems.find(b => b.f === d.f)) return null;
          const cx = tableL + (d.f - 0.5) * fretW;
          const cy = tableT + d.s * stringH;
          const r  = dotSize * 0.45;
          return (
            <G key={`dot-${i}`}>
              <Circle cx={cx} cy={cy} r={r} fill="#1a1714" />
              {chord.fingerNumMode && d.n > 0 && (
                <SvgText
                  x={cx} y={cy + r * 0.38}
                  textAnchor="middle" fontSize={r * 1.1}
                  fill="#fff" fontWeight="600"
                >
                  {d.n}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* 프렛 번호 */}
        {fretLabel ? (
          <SvgText
            x={tableR + width * 0.03}
            y={tableT + stringH * 0.4}
            fontSize={width * 0.07}
            fill="#555"
            fontWeight="500"
          >
            {fretLabel}
          </SvgText>
        ) : null}

      </Svg>
    </View>
  );
}
