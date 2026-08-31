# 코드 로드맵 — 대중음악(비재즈) 전체 코드 후보군 (도수 기준)

C key 기준으로 도수 정리한 것을 D/E/G/A key로 전조. 하나의 표에서 도수→각 key 실제 코드를 바로 대조 가능하도록 구성.
특정 기능(데일리미션 등)에 종속되지 않는 범용 참고자료 — 코드맞추기 문제풀 외에도 난이도 설계·레벨 구성 등 다른 작업에서도 재사용.

현재는 후보 전체집합 단계. 각 기능에서 쓸 부분집합 선별은 그 작업 논의에서 별도 진행.

## 페르소나별 코드풀 요약 (데일리미션)

| 페르소나 | 코드 수 | 적용 키 | 주요 범위 |
|---|---|---|---|
| 언박싱1일차 | 8 | C | 트라이어드만 |
| 굳은살비기너 | 33 | C·D·E·G·A | 트라이어드 + 1전위 + sus2/add9 + 쉬운운지 dom7 |
| 악보의존자 | 65 | C·D·E·G·A | 7th 다이어토닉 + 세컨더리도미넌트 + 릴레이티드ii + 1전위 + 디미니쉬 대리코드 |
| 방구석기타마스터 | 101 | C·D·E·G·A | 트라이톤 대리도미넌트(2·4·6도) + 모달인터체인지 + 다이어토닉텐션 + 하이브리드/슬래시 |
| 기타마스터 | 148 | C·D·E·G·A·F·Bb·Eb | 마이너 다이어토닉 + 화성단조 + 얼터드텐션(b9/#9/b13) + 전 카테고리 확장 |

## 1. 트라이어드 다이어토닉 (vii° 제외)

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| I | C | D | E | G | A |
| ii | Dm | Em | F#m | Am | Bm |
| iii | Em | F#m | G#m | Bm | C#m |
| IV | F | G | A | C | D |
| V | G | A | B | D | E |
| vi | Am | Bm | C#m | Em | F#m |

## 2. 다이어토닉 전위코드 (1전위, 베이스=3음)

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| I/3 | C/E | D/F# | E/G# | G/B | A/C# |
| IV/3 | F/A | G/B | A/C# | C/E | D/F# |
| V/3 | G/B | A/C# | B/D# | D/F# | E/G# |

## 3. 다이어토닉 기능성 코드

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| Isus2 | Csus2 | Dsus2 | Esus2 | Gsus2 | Asus2 |
| Isus4 | Csus4 | Dsus4 | Esus4 | Gsus4 | Asus4 |
| Iadd9 | Cadd9 | Dadd9 | Eadd9 | Gadd9 | Aadd9 |
| IVsus2 | Fsus2 | Gsus2 | Asus2 | Csus2 | Dsus2 |
| IVadd9 | Fadd9 | Gadd9 | Aadd9 | Cadd9 | Dadd9 |
| Vsus4 | Gsus4 | Asus4 | Bsus4 | Dsus4 | Esus4 |

## 4. 7th 다이어토닉

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| IM7 | CM7 | DM7 | EM7 | GM7 | AM7 |
| iim7 | Dm7 | Em7 | F#m7 | Am7 | Bm7 |
| iiim7 | Em7 | F#m7 | G#m7 | Bm7 | C#m7 |
| IVM7 | FM7 | GM7 | AM7 | CM7 | DM7 |
| V7 | G7 | A7 | B7 | D7 | E7 |
| vim7 | Am7 | Bm7 | C#m7 | Em7 | F#m7 |
| viim7b5 | Bm7b5 | C#m7b5 | D#m7b5 | F#m7b5 | G#m7b5 |

## 5. 7th 기능성 코드

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| V7sus4 | G7sus4 | A7sus4 | B7sus4 | D7sus4 | E7sus4 |

## 6. 세컨더리 도미넌트 (V/타겟도수)

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| V/ii | A7 | B7 | C#7 | E7 | F#7 |
| V/iii | B7 | C#7 | D#7 | F#7 | G#7 |
| V/IV | C7 | D7 | E7 | G7 | A7 |
| V/V | D7 | E7 | F#7 | A7 | B7 |
| V/vi | E7 | F#7 | G#7 | B7 | C#7 |

## 7. 릴레이티드 ii (타겟이 마이너 계열일 때만 — ii/iii·ii/V는 기존 다이어토닉과 겹쳐 생략)

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| ii/ii | Em7b5 | F#m7b5 | G#m7b5 | Bm7b5 | C#m7b5 |
| ii/IV | Gm7 | Am7 | Bm7 | Dm7 | Em7 |
| ii/vi | Bm7b5 | C#m7b5 | D#m7b5 | F#m7b5 | G#m7b5 |

## 8. 세컨더리 도미넌트 1전위 (베이스=도미넌트 3음, 반음 상행)

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| V/ii (1전위) | A/C#, A7/C# | B/D#, B7/D# | C#/F, C#7/F | E/G#, E7/G# | F#/A#, F#7/A# |
| V/iii (1전위) | B/D#, B7/D# | C#/F, C#7/F | D#/G, D#7/G | F#/A#, F#7/A# | G#/C, G#7/C |
| V/IV (1전위) | C/E, C7/E | D/F#, D7/F# | E/G#, E7/G# | G/B, G7/B | A/C#, A7/C# |
| V/V (1전위) | D/F#, D7/F# | E/G#, E7/G# | F#/A#, F#7/A# | A/C#, A7/C# | B/D#, B7/D# |
| V/vi (1전위) | E/G#, E7/G# | F#/A#, F#7/A# | G#/C, G#7/C | B/D#, B7/D# | C#/F, C#7/F |

> C#/F, D#/G, G#/C 등은 이론상 E#/F##/B# 표기가 맞지만 실사용 표기(F, G, C)로 단순화.

## 9. 세컨더리 도미넌트 디미니쉬 대리코드 (반음 상행 진행, # 통일)

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| vii°7/ii | C#dim7 | D#dim7 | Fdim7 | G#dim7 | A#dim7 |
| vii°7/iii | D#dim7 | Fdim7 | Gdim7 | A#dim7 | Cdim7 |
| vii°7/IV | Edim7 | F#dim7 | G#dim7 | Bdim7 | C#dim7 |
| vii°7/V | F#dim7 | G#dim7 | A#dim7 | C#dim7 | D#dim7 |
| vii°7/vi | G#dim7 | A#dim7 | Cdim7 | D#dim7 | Fdim7 |

## 10. 트라이톤 대리도미넌트 (반음 하행 진행, b 통일, dom7#11)

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| subV7/ii | Eb7#11 | F7#11 | G7#11 | Bb7#11 | C7#11 |
| subV7/iii | F7#11 | G7#11 | A7#11 | C7#11 | D7#11 |
| subV7/IV | Gb7#11 | Ab7#11 | Bb7#11 | Db7#11 | Eb7#11 |
| subV7/V | Ab7#11 | Bb7#11 | C7#11 | Eb7#11 | F7#11 |
| subV7/vi | Bb7#11 | C7#11 | D7#11 | F7#11 | G7#11 |

## 11. 모달인터체인지 (자주 쓰는 실전형)

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| bIIM7 | DbM7 | EbM7 | FM7 | AbM7 | BbM7 |
| bIIIM7 | EbM7 | FM7 | GM7 | BbM7 | CM7 |
| ivm6 | Fm6 | Gm6 | Am6 | Cm6 | Dm6 |
| #ivm7b5 | F#m7b5 | G#m7b5 | A#m7b5 | C#m7b5 | D#m7b5 |
| vm7 | Gm7 | Am7 | Bm7 | Dm7 | Em7 |
| bVIM7 | AbM7 | BbM7 | CM7 | EbM7 | FM7 |
| bVIIM7 | BbM7 | CM7 | DM7 | FM7 | GM7 |
| bVII7 | Bb7 | C7 | D7 | F7 | G7 |

## 12. 다이어토닉 텐션

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| IM7(9) | CM7(9) | DM7(9) | EM7(9) | GM7(9) | AM7(9) |
| iim7(9) | Dm7(9) | Em7(9) | F#m7(9) | Am7(9) | Bm7(9) |
| iim7(11) | Dm7(11) | Em7(11) | F#m7(11) | Am7(11) | Bm7(11) |
| iiim7(9) | Em7(9) | F#m7(9) | G#m7(9) | Bm7(9) | C#m7(9) |
| IVM7(9) | FM7(9) | GM7(9) | AM7(9) | CM7(9) | DM7(9) |
| V7(9) | G7(9) | A7(9) | B7(9) | D7(9) | E7(9) |
| V7(b9) | G7(b9) | A7(b9) | B7(b9) | D7(b9) | E7(b9) |
| vim7(9) | Am7(9) | Bm7(9) | C#m7(9) | Em7(9) | F#m7(9) |

## 13. 세컨더리 도미넌트 텐션

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| V/ii(b9,#9,b13) | A7(b9/#9/b13) | B7(b9/#9/b13) | C#7(b9/#9/b13) | E7(b9/#9/b13) | F#7(b9/#9/b13) |
| V/iii(b9,#9,b13) | B7(b9/#9/b13) | C#7(b9/#9/b13) | D#7(b9/#9/b13) | F#7(b9/#9/b13) | G#7(b9/#9/b13) |
| V/IV(9) | C7(9) | D7(9) | E7(9) | G7(9) | A7(9) |
| V/vi(b9,#9,b13) | E7(b9/#9/b13) | F#7(b9/#9/b13) | G#7(b9/#9/b13) | B7(b9/#9/b13) | C#7(b9/#9/b13) |

## 14. 분수·하이브리드 코드 (도수/베이스도수)

| 도수 | C | D | E | G | A |
|---|---|---|---|---|---|
| I/5 | C/G | D/A | E/B | G/D | A/E |
| I/b7 | C/Bb | D/C | E/D | G/F | A/G |
| I/7 | C/B | D/C# | E/D# | G/F# | A/G# |
| IV/1 | F/C | G/D | A/E | C/G | D/A |
| IV/5 | F/G | G/A | A/B | C/D | D/E |
| ivm/b6 | Fm/Ab | Gm/Bb | Am/C | Cm/Eb | Dm/F |
| V/1 | G/C | A/D | B/E | D/G | E/A |
| V/4 | G/F | A/G | B/A | D/C | E/D |

## 고난이도 전용 (F / Bb key)

### 1. 트라이어드 다이어토닉

| 도수 | F | Bb |
|---|---|---|
| I | F | Bb |
| ii | Gm | Cm |
| iii | Am | Dm |
| IV | Bb | Eb |
| V | C | F |
| vi | Dm | Gm |

### 2. 다이어토닉 전위코드

| 도수 | F | Bb |
|---|---|---|
| I/3 | F/A | Bb/D |
| IV/3 | Bb/D | Eb/G |
| V/3 | C/E | F/A |

### 3. 다이어토닉 기능성 코드

| 도수 | F | Bb |
|---|---|---|
| Isus2 | Fsus2 | Bbsus2 |
| Isus4 | Fsus4 | Bbsus4 |
| Iadd9 | Fadd9 | Bbadd9 |
| IVsus2 | Bbsus2 | Ebsus2 |
| IVadd9 | Bbadd9 | Ebadd9 |
| Vsus4 | Csus4 | Fsus4 |

### 4. 7th 다이어토닉

| 도수 | F | Bb |
|---|---|---|
| IM7 | FM7 | BbM7 |
| iim7 | Gm7 | Cm7 |
| iiim7 | Am7 | Dm7 |
| IVM7 | BbM7 | EbM7 |
| V7 | C7 | F7 |
| vim7 | Dm7 | Gm7 |
| viim7b5 | Em7b5 | Am7b5 |

### 5. 7th 기능성 코드

| 도수 | F | Bb |
|---|---|---|
| V7sus4 | C7sus4 | F7sus4 |

### 6. 세컨더리 도미넌트

| 도수 | F | Bb |
|---|---|---|
| V/ii | D7 | G7 |
| V/iii | E7 | A7 |
| V/IV | F7 | Bb7 |
| V/V | G7 | C7 |
| V/vi | A7 | D7 |

### 7. 릴레이티드 ii

| 도수 | F | Bb |
|---|---|---|
| ii/ii | Am7b5 | Dm7b5 |
| ii/IV | Cm7 | Fm7 |
| ii/vi | Em7b5 | Am7b5 |

### 8. 세컨더리 도미넌트 1전위

| 도수 | F | Bb |
|---|---|---|
| V/ii (1전위) | D/F#, D7/F# | G/B, G7/B |
| V/iii (1전위) | E/G#, E7/G# | A/C#, A7/C# |
| V/IV (1전위) | F/A, F7/A | Bb/D, Bb7/D |
| V/V (1전위) | G/B, G7/B | C/E, C7/E |
| V/vi (1전위) | A/C#, A7/C# | D/F#, D7/F# |

### 9. 세컨더리 도미넌트 디미니쉬 대리코드

| 도수 | F | Bb |
|---|---|---|
| vii°7/ii | F#dim7 | Bdim7 |
| vii°7/iii | G#dim7 | C#dim7 |
| vii°7/IV | Adim7 | Ddim7 |
| vii°7/V | Bdim7 | Edim7 |
| vii°7/vi | C#dim7 | F#dim7 |

### 10. 트라이톤 대리도미넌트

| 도수 | F | Bb |
|---|---|---|
| subV7/ii | Ab7#11 | Db7#11 |
| subV7/iii | Bb7#11 | Eb7#11 |
| subV7/IV | B7#11 | E7#11 |
| subV7/V | Db7#11 | Gb7#11 |
| subV7/vi | Eb7#11 | Ab7#11 |

### 11. 모달인터체인지

| 도수 | F | Bb |
|---|---|---|
| bIIM7 | GbM7 | CbM7 (B) |
| bIIIM7 | AbM7 | DbM7 |
| ivm6 | Bbm6 | Ebm6 |
| #ivm7b5 | Bm7b5 | Em7b5 |
| vm7 | Cm7 | Fm7 |
| bVIM7 | DbM7 | GbM7 |
| bVIIM7 | EbM7 | AbM7 |
| bVII7 | Eb7 | Ab7 |

### 12. 다이어토닉 텐션

| 도수 | F | Bb |
|---|---|---|
| IM7(9) | FM7(9) | BbM7(9) |
| iim7(9) | Gm7(9) | Cm7(9) |
| iim7(11) | Gm7(11) | Cm7(11) |
| iiim7(9) | Am7(9) | Dm7(9) |
| IVM7(9) | BbM7(9) | EbM7(9) |
| V7(9) | C7(9) | F7(9) |
| V7(b9) | C7(b9) | F7(b9) |
| vim7(9) | Dm7(9) | Gm7(9) |

### 13. 세컨더리 도미넌트 텐션

| 도수 | F | Bb |
|---|---|---|
| V/ii(b9,#9,b13) | D7(b9/#9/b13) | G7(b9/#9/b13) |
| V/iii(b9,#9,b13) | E7(b9/#9/b13) | A7(b9/#9/b13) |
| V/IV(9) | F7(9) | Bb7(9) |
| V/vi(b9,#9,b13) | A7(b9/#9/b13) | D7(b9/#9/b13) |

### 14. 분수·하이브리드 코드

| 도수 | F | Bb |
|---|---|---|
| I/5 | F/C | Bb/F |
| I/b7 | F/Eb | Bb/Ab |
| I/7 | F/E | Bb/A |
| IV/1 | Bb/F | Eb/Bb |
| IV/5 | Bb/C | Eb/F |
| ivm/b6 | Bbm/Db | Ebm/Gb |
| V/1 | C/F | F/Bb |
| V/4 | C/Bb | F/Eb |

## 방구석 기타마스터 전용 (Eb key)

### 1. 트라이어드 다이어토닉

| 도수 | Eb |
|---|---|
| I | Eb |
| ii | Fm |
| iii | Gm |
| IV | Ab |
| V | Bb |
| vi | Cm |

### 2. 다이어토닉 전위코드

| 도수 | Eb |
|---|---|
| I/3 | Eb/G |
| IV/3 | Ab/C |
| V/3 | Bb/D |

### 3. 다이어토닉 기능성 코드

| 도수 | Eb |
|---|---|
| Isus2 | Ebsus2 |
| Isus4 | Ebsus4 |
| Iadd9 | Ebadd9 |
| IVsus2 | Absus2 |
| IVadd9 | Abadd9 |
| Vsus4 | Bbsus4 |

### 4. 7th 다이어토닉

| 도수 | Eb |
|---|---|
| IM7 | EbM7 |
| iim7 | Fm7 |
| iiim7 | Gm7 |
| IVM7 | AbM7 |
| V7 | Bb7 |
| vim7 | Cm7 |
| viim7b5 | Dm7b5 |

### 5. 7th 기능성 코드

| 도수 | Eb |
|---|---|
| V7sus4 | Bb7sus4 |

### 6. 세컨더리 도미넌트

| 도수 | Eb |
|---|---|
| V/ii | C7 |
| V/iii | D7 |
| V/IV | Eb7 |
| V/V | F7 |
| V/vi | G7 |

### 7. 릴레이티드 ii

| 도수 | Eb |
|---|---|
| ii/ii | Gm7b5 |
| ii/IV | Bbm7 |
| ii/vi | Dm7b5 |

### 8. 세컨더리 도미넌트 1전위

| 도수 | Eb |
|---|---|
| V/ii (1전위) | C/E, C7/E |
| V/iii (1전위) | D/F#, D7/F# |
| V/IV (1전위) | Eb/G, Eb7/G |
| V/V (1전위) | F/A, F7/A |
| V/vi (1전위) | G/B, G7/B |

### 9. 세컨더리 도미넌트 디미니쉬 대리코드

| 도수 | Eb |
|---|---|
| vii°7/ii | Edim7 |
| vii°7/iii | F#dim7 |
| vii°7/IV | Gdim7 |
| vii°7/V | Adim7 |
| vii°7/vi | Bdim7 |

### 10. 트라이톤 대리도미넌트

| 도수 | Eb |
|---|---|
| subV7/ii | Gb7#11 |
| subV7/iii | Ab7#11 |
| subV7/IV | A7#11 |
| subV7/V | B7#11 |
| subV7/vi | Db7#11 |

### 11. 모달인터체인지

| 도수 | Eb |
|---|---|
| bIIM7 | FbM7 (E) |
| bIIIM7 | GbM7 |
| ivm6 | Abm6 |
| #ivm7b5 | Am7b5 |
| vm7 | Bbm7 |
| bVIM7 | CbM7 (B) |
| bVIIM7 | DbM7 |
| bVII7 | Db7 |

### 12. 다이어토닉 텐션

| 도수 | Eb |
|---|---|
| IM7(9) | EbM7(9) |
| iim7(9) | Fm7(9) |
| iim7(11) | Fm7(11) |
| iiim7(9) | Gm7(9) |
| IVM7(9) | AbM7(9) |
| V7(9) | Bb7(9) |
| V7(b9) | Bb7(b9) |
| vim7(9) | Cm7(9) |

### 13. 세컨더리 도미넌트 텐션

| 도수 | Eb |
|---|---|
| V/ii(b9,#9,b13) | C7(b9/#9/b13) |
| V/iii(b9,#9,b13) | D7(b9/#9/b13) |
| V/IV(9) | Eb7(9) |
| V/vi(b9,#9,b13) | G7(b9/#9/b13) |

### 14. 분수·하이브리드 코드

| 도수 | Eb |
|---|---|
| I/5 | Eb/Bb |
| I/b7 | Eb/Db |
| I/7 | Eb/D |
| IV/1 | Ab/Eb |
| IV/5 | Ab/Bb |
| ivm/b6 | Abm/Cb (B) |
| V/1 | Bb/Eb |
| V/4 | Bb/Ab |

## 미정

- 이 표는 **후보 전체집합**. 각 기능(데일리미션 등)에서 쓸 부분집합 선별 기준은 별도 논의.
- 위 F/Bb/Eb 표기 중 일부(Cb, Fb 등)는 이론상 정확한 표기이나 실사용 편의상 괄호로 자연음 표기 병기.
