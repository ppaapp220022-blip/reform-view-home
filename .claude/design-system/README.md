# RE:FORM Design System

**RE:FORM** is a sports-uniform resale marketplace with a community board.
"리:폼" — *re-form, re-fit, re-team.* The brand pairs **varsity-sport energy** with the **steady, trustworthy feel of a transaction platform**.

The visual DNA is captured in the icon: a **navy circle frame** with chunky **varsity letterforms** "R:F", **speed-line stripes** trailing left, and a **red "F"** breaking out of the ring on the right. Sporty, kinetic, but mechanically clean.

## Sources provided
- `reference/index.css` — original 3-layer token system (Primitive → Semantic → Base)
- `reference/tailwind.config.ts` — Tailwind mapping (colors, fonts, radii, shadows, motion)
- `assets/re-form_icon.png` — primary product icon (1254×1254)
- `assets/re-form_logo_main.svg`, `assets/re-form_logo_main_dark.svg`, `assets/re-form_logo_simple.svg` — !!! image-wrapper SVGs (PNG base64 임베드). 렌더링은 정상이나 CSS fill/stroke로 색 변경 불가. `<img>` 태그로만 사용할 것. 확대 시 비트맵 해상도 한계 주의 (권장 height: main 24–32px, simple 20–28px).
- `fonts/IAMAPLAYER.woff2` — sporty display face (Latin/numerals only)
- `fonts/Pretendard-{Regular…ExtraBold}.woff2` — Korean + Latin body family

The original codebase mentions React + Vite + TS + Tailwind. No source repo was attached, so the UI kit is reconstructed from the token files plus the brand description (sports uniform resale + community board, mobile-first, top GNB + bottom tab bar).

---

## Index — what's in this folder

| Path | What it is |
|---|---|
| `README.md` | This file. Brand context, content/visual/icon foundations. |
| `SKILL.md` | Agent-skill manifest. Read this first if you're a coding agent. |
| `colors_and_type.css` | Token CSS (no Tailwind). Drop into any HTML artifact. |
| `assets/` | Logos and icon (PNG icon is the reliable one). |
| `fonts/` | Pretendard 400–800 + IAMAPLAYER. |
| `reference/` | Original `index.css` + `tailwind.config.ts` from the team. |
| `preview/` | Per-token cards rendered for the Design System tab. |
| `ui_kits/web/` | Mobile-first marketplace recreation (GNB + tab bar, listings, detail, community board). |

---

## CONTENT FUNDAMENTALS — voice & copy

**Tone.** Energetic but trustworthy. Think locker-room hype dialed down for a transaction. Korean-first, with English/numerics borrowed from the sport vernacular ("MVP", "DRAFT", "TRADE").

**Person.** **반말 금지.** All UI copy is polite Korean — `~합니다 / ~하세요 / ~해보세요`. Address the user as **"회원님" / "당신"** when needed; usually the subject is implicit.

**Casing.**
- Korean body: natural sentence case.
- English in display headers: **ALL CAPS, tight tracking** (matches IAMAPLAYER and Bebas Neue).
- Numerics in display contexts: tabular numerals via IAMAPLAYER. Prices are always navy, never red — red is reserved for actions/alerts.

**Length & rhythm.**
- Page titles: ≤ 8 글자 (e.g. "오늘의 유니폼", "근처 거래", "TRADE NOW").
- CTAs: 2–4 글자 verbs ("거래하기", "등록", "찜", "채팅").
- List item subtitles: 한 줄, 22자 이내, ellipsis on overflow.
- Empty states use a friendly nudge, not an apology — "아직 등록된 유니폼이 없어요. 첫 등록자가 되어보세요."

**Numbers & units.**
- 가격: `₩89,000` (천 단위 콤마, 원화 기호 앞).
- 사이즈: `M / L / XL / 95 / 100`.
- 거리: `1.2km`, never spelled out.
- 좋아요/조회수 over 1k: `1.2k`, `12.3k`.

**Emoji.** **No emoji in product UI.** The brand has its own iconography (varsity, speed lines, jerseys). Emoji are reserved for community board user-generated text only.

**Examples.**
- Hero headline: `MVP는 / 당신의 폼을 알아본다` — IAMAPLAYER + Pretendard 혼용.
- Listing card title: `맨유 22-23 홈 어센틱` (사이즈, 컨디션은 메타 row로 분리).
- Action button: `거래 시작하기` — never "Click here", never "Buy now".
- Toast: `찜 목록에 추가했습니다` (period 없음).
- Error: `이미지를 불러오지 못했어요. 다시 시도해주세요.` (~해요체 OK in apologetic states).

---

## VISUAL FOUNDATIONS

**Palette.** Two-color brand (Navy `#002147` + Red `#FF2E4D`) layered over cool neutral surfaces. Navy carries 90% of the chrome — headers, primary buttons, prices, body type. Red is **reserved**: hot CTAs, "라이브" badges, error states, the dot in the `R:F` colon. Gold `#FFB800` and Neon Green `#00FFAB` exist but are **trophy/special-mode accents** — use sparingly (sold-status, MVP tags). Surfaces are a cool gray (`#E8EBF0` page bg, white cards).

**Type — 3-Tier Font Rule.** <!-- 2026-05-09 -->

**Tier 1 (최우선): IAMAPLAYER** — A–Z, 0–9, 기본 구두점만 지원. 가격(`₩89,000`), 등번호, 거리, 영문 레이블(TRADE, LIVE, SOLD, HOT TAGS 등). 한글 절대 금지 — Giants/Pretendard 폴백으로 깨져 보임. Tailwind: `font-player` 또는 인라인 `fontFamily:"'IAMAPLAYER',Giants,sans-serif"`.

**Tier 2 (기본): Pretendard 400–800** — 한글+영문 본문, 설명, 레이블, 입력창, 폼 안내. html 기본 폰트 = Pretendard이므로 `font-sans`를 별도 명시할 필요 없음.

**Tier 3 (강조): Giants Regular/Bold** — h1~h6(CSS 자동), button(CSS 자동), 섹션 타이틀, 내비게이션 레이블, empty state 타이틀, 중요 UI 패널 헤더. Tailwind: `font-display font-bold`. 한글+영문 모두 지원.

**장식 전용: Giants-Inline** — 히어로 대형 헤딩, 브랜드 임팩트 순간만. 로고에 사용 금지. Tailwind: `font-inline`.

**Spacing.** 8px grid. Tailwind extras at 18 / 52 / 60 / 72 / 88 / 104 / 120 / 136 px. Cards have **16px inner padding** on mobile, 20–24 on desktop. Tab bar height **64px**, GNB **56px**.

**Backgrounds.** Solid surfaces — no gradients in product chrome. The one allowed background pattern is **diagonal speed-line stripes** (echoing the logo) at low opacity behind hero numerics or empty states. No noise/grain. No full-bleed photography in chrome — photos belong inside listing cards, framed.

**Animation.**
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (sport) for entrances, `cubic-bezier(0.34, 1.56, 0.64, 1)` (bounce-sport) for confirmations only.
- Durations: 80ms (taps), 120ms (hovers), 200ms (panels), 300ms (modals).
- Three named keyframes: `fadeInUp` (12px rise + opacity), `scaleIn` (0.95→1), `glowPulse` (red shadow ring) — pulse is reserved for the LIVE indicator.
- No bounces on lists. No parallax. No marquee.

**Hover states.** Desktop only. Cards: border darkens (`border` → `border-strong`) and `shadow-card` → `shadow-card-hover`. Buttons: navy background → navy-2 (`#1A3051`); red button → `#e0001f`. Links: red → red-hover. Never opacity-fade-on-hover — it reads as disabled.

**Press states.** Mobile-first, so press states matter. Buttons scale `scale(0.97)` over 80ms with the sport easing. Tab-bar items get a 6px pill background flash in `--color-primary-subtle`. No long-press feedback unless functionally needed.

**Borders.** 1px hairlines at `rgba(13,27,42,.10)` default, `.20` on strong. **No** colored borders except red on error, navy-2 on focus rings (3px outer ring at 20% navy alpha).

**Shadows.** All shadows are **navy-tinted** (`rgba(0,33,71,...)`) — never neutral black. Three primary tiers: `shadow-card` (resting), `shadow-card-hover` (lifted), `shadow-modal` (overlay). `shadow-btn-accent` is a red glow (`rgba(255,46,77,.35)`) for the primary trade CTA.

**Capsules vs gradients.** Status uses **filled capsules with matching tinted bg + matching colored text + 40%-alpha colored border** — never gradient pills. Protection gradients (e.g. behind hero text on a photo) use a single navy→transparent vertical fade, never multi-stop rainbows.

**Layout rules.**
- Page max width 1280px (`maxWidth.page`); content column 1126px.
- **Mobile-first**: 360px design baseline, 16px gutters, full-width cards.
- Top **GNB** (56px) is always sticky, navy on white. Bottom **tab bar** (64px) is white with navy iconography, sticky.
- Listing grids: 2-up on mobile, 3-up at ≥720px, 4-up at ≥1024px. Card aspect 4:5.

**Transparency / blur.** Glassy chrome only on full-screen image overlays (e.g. listing photo viewer header) — `backdrop-filter: blur(12px)` over a 60%-alpha navy. Otherwise solid.

**Imagery treatment.** Listing photos are user-supplied; show as-is, no filter. Brand photography (when added) skews **cool, neutral, daylight** — no warm filters, no heavy contrast. Black-and-white only for archived/sold-out states (50% opacity overlay).

**Corner radii.** 8px buttons, 10–12px cards, 16px modals, full-pill badges. Never sharp 0px corners except inside dense data tables.

**Cards.** Always `--color-surface` (white), `1px solid --color-border`, `--r-card` (12px), `shadow-card`. Hover bumps to strong border + card-hover shadow. No left-color-accent stripe. No emoji slot.

---

## LOGO USAGE

**파일 구성**

| 파일 | 설명 | 권장 height |
|---|---|---|
| `public/assets/re-form_logo_main.svg` | 전체 워드마크 — 라이트 모드 (비율 4.24:1) | 24–32px |
| `public/assets/re-form_logo_main_dark.svg` | 전체 워드마크 — 다크 모드 (비율 4.24:1) | 24–32px |
| `public/assets/re-form_logo_simple.svg` | 간략 워드마크 — 라이트/다크 겸용 (비율 5.45:1) | 20–28px |
| `public/assets/re-form_icon.png` | 브랜드 아이콘 단독 (1254×1254) | ≥48px |

**다크모드 전환 동작**
- `variant="main"` → 다크모드 자동 감지 후 `main_dark.svg` 전환 (Tailwind .dark 클래스 + OS prefers-color-scheme 양쪽 지원)
- `variant="simple"` → 모드 무관 단일 파일 사용

**사용 컴포넌트** — `src/components/ui/Logo.tsx`

```tsx
// 공간이 충분한 곳 (GNB, 인증 페이지, 랜딩)
<Logo variant="main" height={28} />

// 공간이 좁은 곳 (Footer, 모바일 헤더, 사이드바)
<Logo variant="simple" height={24} />
```

**사용 규칙**
- GNB / 인증 페이지 / 랜딩 히어로 → `main`
- Footer / 모달 헤더 / 이메일 상단 등 compact 영역 → `simple`
- 텍스트 로고 직접 하드코딩 금지 — 반드시 `Logo` 컴포넌트 사용
- CSS `fill` / `stroke` 로 색상 변경 불가 (PNG 임베드 파일)
- 반드시 `<img>` 태그로만 렌더링 (`<object>`, `inline SVG` 사용 금지)
- 배경색이 어두운 경우: 현재 SVG는 라이트 배경 전용 — 다크 배경에는 사용 보류

---

## ICONOGRAPHY

The codebase doesn't ship a custom icon font or sprite. **Default to Lucide** (`https://unpkg.com/lucide@latest`) — 24×24, 1.75–2px stroke, rounded line caps. Lucide's stroke weight matches the brand's clean-mechanical feel and pairs cleanly with Pretendard.

**Substitutes flagged:** when the team eventually ships a custom icon set (jersey, helmet, ball-by-sport), swap the Lucide imports out. Likely candidates that don't exist in Lucide and need custom SVG: jersey silhouettes, sport-type filters (축구/야구/농구/배구), condition-grade badges (S/A/B/C).

**Rules.**
- Stroke: **2px** at 24px size, 1.75 at 20px, 1.5 at 16px. Filled icons only for tab-bar **active** states.
- Color: inherits `currentColor`. Default chrome icons = navy (`--color-text-main`); active tab = navy filled; destructive = `--color-accent` (red).
- Hit target: 44px min on mobile (icon centered in a transparent square).
- No outline + filled mix in the same row.

**The brand mark** is **not** an icon — never inline it as a 24px glyph. Use `assets/re-form_icon.png` at ≥48px. 로고는 `<Logo variant="main"|"simple" />` 컴포넌트 사용 (`src/components/ui/Logo.tsx`).

**Emoji.** Off-limits in product chrome. Allowed only in user-generated community-board posts.

**Unicode.** No decorative unicode (★, ✓, →) — use Lucide equivalents (`star`, `check`, `arrow-right`).

---

## CAVEATS / OPEN ASKS

1. SVG 로고 2종은 PNG를 base64로 임베드한 래퍼 파일 — 렌더링은 가능하나 벡터 원본 아님. `Logo` 컴포넌트 (`src/components/ui/Logo.tsx`)로 추상화 완료.
2. No production codebase or Figma was attached, so the UI kit is a **reconstruction** from the token files + brand brief, not a copy. If a repo or Figma exists, attach it and I'll align the UI kit pixel-for-pixel.
3. **No custom icon set** was provided. Lucide is the default; sport-specific glyphs (jerseys, sport-type pictograms) need a real set when one exists.
4. Sample copy in the UI kit (team names, prices, jersey listings) is fabricated. Replace with real catalogue data when available.

---

## COLOR ROLE RULES — primary vs accent <!-- 2026-05-08 -->

### 핵심 원칙

Navy(`--color-primary`)와 Red(`--color-accent`)는 쓰임새가 엄격히 다르다.

**`--color-primary` (navy) — 브랜드 크롬 전용**
- 버튼 배경, 헤더 배경, 가격 텍스트, 브랜드 장식 요소
- 다크모드에서 `#1A3051`로 전환 → dark surface 위에서 식별 불가
- **인터랙티브 active/hover 상태에 절대 사용 금지**

**`--color-accent` (red `#FF2E4D`) — 인터랙티브 신호 전용**
- 활성 탭, 활성 메뉴, hover 텍스트, CTA, 에러, 라이브 뱃지
- 라이트/다크 양쪽에서 항상 선명 — 모드에 관계없이 안전
- **가격 텍스트에 절대 사용 금지** (red = 위험/에러 신호로 예약됨)

### 인터랙티브 상태별 올바른 변수

```
활성 탭 텍스트/아이콘  → --color-accent
활성 탭 pill 배경     → --color-accent-subtle
내비게이션 활성 언더바  → --color-accent
Link/버튼 hover      → --color-accent
포커스 링            → --color-border-focus
비활성 텍스트         → --color-text-sub
힌트/플레이스홀더      → --color-text-hint
```

### 다크모드 안전 변수 (라이트/다크 모두에서 동작 보장)

```
항상 안전:   --color-accent / --color-accent-subtle
             --color-text-main / --color-text-sub / --color-text-hint
             --color-border / --color-border-strong
             --color-success / --color-error / --color-warning / --color-info

다크모드 위험: --color-primary (navy → dark에서 묻힘)
              --color-primary-subtle (dark에서 너무 흐릿)
```
