코드 작성 시 주석을 상세히 달 것.

## 디자인 시스템 참조 의무 !!!

**UI/시각 관련 작업 시작 전 반드시 아래 파일을 Read할 것.**

| 파일                                | 내용                             |
|-----------------------------------|--------------------------------|
| `.claude/design-system/README.md` | 브랜드 가이드 전문 (컬러·타이포·레이아웃·카피 규칙) |
| `.claude/design-system/SKILL.md`  | 에이전트용 스킬 매니페스트                 |
| `src/index.css`                   | 실제 CSS 변수 정의 (3-Layer Token)   |

적용 범위: 페이지 신규 작성, 컴포넌트 신규 작성, 스타일 편집, 색상·간격·타이포 결정 — 모든 시각적 변경 포함.

**체크리스트 (작업 전 확인)**

- [ ] README.md의 VISUAL FOUNDATIONS, COLOR ROLE RULES 섹션 확인
- [ ] 사용할 CSS 변수가 `src/index.css`에 실제로 존재하는지 확인
- [ ] 다크모드 양쪽(라이트/다크)에서 색상 대비 확인
- [ ] 이모지 없음, 하드코딩 hex 없음, 존재하지 않는 변수명 없음

## 파일 수정 시 주의사항 !!!

### 파일 잘림 버그 — 원인과 대응 전략

이 프로젝트의 파일들은 Windows↔Linux 마운트를 통해 접근되며, 파일 쓰기 도구들이 대용량 파일을 잘라먹는 고질적 버그가 있음.
**실제로 발생한 사례**: GNB.tsx(~20KB) 수정 중 Python write로 파일이 491줄에서 잘려 JSX 후반부가 통째로 소실됨.

#### 도구별 버그 수준

| 도구               | 버그 수준                      | 대응                      |
|------------------|----------------------------|-------------------------|
| Edit 툴           | ~20KB 이상에서 뒷부분 truncation  | **절대 사용 금지**            |
| Write 툴          | 마운트 경계에서 truncation        | **절대 사용 금지**            |
| Python `open(w)` | 마운트 경계에서 가끔 truncation     | 사용 가능하나 **반드시 검증 필수**   |
| `sed -i`         | 타깃 라인만 수정, 파일 전체 재작성 없음    | **항상 1순위** (단순 교체 시)    |

#### 수정 방식 우선순위 (이 순서 절대 준수)

1. **`sed -i`** — 단순 문자열 교체. 파일을 재작성하지 않으므로 잘림 없음. **항상 이걸 먼저 시도.**
2. **Python read→modify→write** — 다중 위치 변경 등 복잡한 경우만. 아래 템플릿 필수 사용.
3. **Edit / Write 툴** — 5KB 미만 소형 파일에서만. 그 외는 사용 금지.

#### Python 쓰기 필수 템플릿 (검증 3단계 내장)

```python
import subprocess

path = '/sessions/.../mnt/re-form_view/파일경로'  # bash 절대경로 사용

# [검증 1] 수정 전 줄 수 기록
before = int(subprocess.check_output(['wc', '-l', path]).split()[0])

with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# ... 수정 작업 ...

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

# [검증 2] 줄 수 비교 — 10% 이상 감소 시 즉시 중단
after = int(subprocess.check_output(['wc', '-l', path]).split()[0])
assert after >= before * 0.9, f"파일 잘림! {before}→{after}줄"
print(f"OK: {before}→{after}줄")

# [검증 3] 파일 끝 확인 — 반드시 닫는 괄호로 끝나야 함
tail = subprocess.check_output(['tail', '-3', path]).decode()
print("파일 끝:", tail)

# [검증 4] NUL 바이트 확인
nul = open(path, 'rb').read().count(b'\x00')
assert nul == 0, f"NUL 바이트 {nul}개 발견!"
```

#### 잘림 감지 즉시 복구 절차

```bash
# 1. git show로 원본 내용 확인
git show HEAD:src/경로/파일.tsx | wc -l

# 2. Python으로 git 원본을 직접 꺼내 쓰기 (git checkout은 마운트에서 실패함)
python3 -c "
import subprocess
content = subprocess.check_output(['git', 'show', 'HEAD:src/경로/파일.tsx'], cwd='/sessions/.../mnt/re-form_view').decode()
open('/sessions/.../mnt/re-form_view/src/경로/파일.tsx', 'w').write(content)
print('복구 완료:', content.count(chr(10)), '줄')
"

# 3. 복구 후 재작업
```

#### 체크리스트 (Python write 후 매번)

- [ ] 줄 수 감소 없음 (assert로 확인)
- [ ] `tail -3` 으로 파일 끝이 `}` 또는 `}
` 인지 확인
- [ ] NUL 바이트 0개 확인
- [ ] ESLint 파싱 에러 없음 (`npx eslint 파일경로 2>&1 | grep "Parsing"`)

## 메모리 파일 운용 지침

나(Claude)는 세션 간 기억이 없으므로, 프로젝트 컨텍스트를 `.claude/memory.md` 에 기록하고 매 세션 시작 시 읽는다.

### 필수 루틴

1. **세션 시작 시**: 가장 먼저 `.claude/memory.md` 를 Read 할 것
2. **작업 완료 후**: 새로운 결정·변경사항·이슈를 memory.md 에 업데이트할 것
3. **업데이트 기준**: 설계 결정, 파일 구조 변경, 해결된 버그, 다음 할 일이 생겼을 때

### 기록 원칙

- 간결하게: 토큰 절약을 위해 핵심만 bullet로 기록
- 날짜 기록: 변경 항목 옆에 날짜 표기 (예: `<!-- 2026-05-07 -->`)
- 완료 항목은 삭제하지 말고 `[done]` 태그로 처리 (히스토리 보존)
- 파일 크기가 200줄을 넘으면 오래된 `[done]` 항목을 정리할 것

## 작업 범위 제한 !!!

**백엔드 폴더(`RE_FORM_Shop_2605`) 수정 절대 금지.**

- 해당 폴더는 참고용(read-only)으로만 열려 있음
- API 구조 파악, DTO/엔티티 타입 확인 목적으로만 읽을 것
- 코딩 작업은 오직 `re-form_view` (React 프론트엔드)에서만 수행

## 기술 스택 (확정) <!-- 2026-05-07 -->

| 구분         | 라이브러리                                        |
|------------|----------------------------------------------|
| 라우터        | react-router-dom v7 (`createBrowserRouter`)  |
| 전역 상태      | Zustand (`useAuthStore` 등)                   |
| HTTP 클라이언트 | Axios (`src/lib/axios.ts` 인스턴스 사용)           |
| 서버 상태      | TanStack Query v5 (`src/lib/queryClient.ts`) |
| 스타일        | Tailwind CSS v3 + CSS Variables (디자인 시스템)    |

## src 폴더 구조 (Feature-based) <!-- 2026-05-07 -->

```
src/
├── features/          ← 기능별 모듈 (auth/listing/chat/trade/payment/community/mypage/admin)
│   └── {feature}/
│       ├── components/   ← 해당 기능 전용 컴포넌트
│       ├── hooks/        ← 해당 기능 전용 훅 (useQuery 래퍼 등)
│       └── api/          ← 해당 기능 API 함수 (axios 호출)
├── components/
│   ├── ui/            ← 공통 UI (Button, Badge, Input, Modal 등)
│   └── layout/        ← GNB, Footer, Layout 래퍼
├── pages/             ← 라우터에서 직접 연결되는 페이지 컴포넌트
├── hooks/             ← 전역 공통 훅
├── store/             ← Zustand 스토어 (authStore.ts 등)
├── lib/               ← axios 인스턴스, queryClient 설정
├── types/             ← 공통 TypeScript 타입
└── utils/             ← 순수 유틸 함수
```

### 라우트 구조 (`src/router.tsx`)

- 17개 화면 라우트 정의됨 (페이지 미구현 시 Placeholder 컴포넌트 사용)
- 페이지 구현 시: `src/pages/` 에 컴포넌트 생성 → `router.tsx` import 교체

## 코드 스타일 지침 <!-- 2026-05-07 -->

### 이모지 금지

- **소스 코드 어디에도 이모지 사용 금지** — 주석, 문자열, JSX 텍스트, console.log 모두 포함
- 아이콘이 필요하면 `lucide-react` 컴포넌트 사용
- 예외: `memory.md` 등 개발 문서에서 강조 목적으로 제한적 사용 허용

### 아이콘

- 아이콘은 `lucide-react`를 기본으로 사용
- 스포츠 전용 아이콘(유니폼, 종목 등) 등 Lucide에 없는 것만 커스텀 SVG로 작성
- stroke 굵기: 24px → 2px / 20px → 1.75px / 16px → 1.5px

### 폰트 사용 규칙 !!! <!-- 2026-05-09 업데이트: 3-Tier 규칙 확립 -->

#### 폰트 3-Tier 규칙 (우선순위 순)

| Tier        | 조건                  | 폰트           | Tailwind 클래스         | 인라인 스타일                                          |
|-------------|---------------------|--------------|----------------------|--------------------------------------------------|
| **1 (최우선)** | 영문(알파벳)·숫자만 쓰이는 곳   | `IAMAPLAYER` | `font-player`        | `fontFamily: "'IAMAPLAYER',Giants,sans-serif"`   |
| **2 (기본)**  | 본문·디폴트 텍스트 (한글 포함)  | `Pretendard` | `font-sans` (명시 불필요) | `fontFamily: "'Pretendard',Giants,sans-serif"`   |
| **3 (강조)**  | 두꺼운 글씨·잘 보여야 하는 텍스트 | `Giants`     | `font-display`       | `fontFamily: "'Giants','Pretendard',sans-serif"` |

**Tier 판단 기준**

- 영문+숫자만: 가격(`₩89,000`), 등번호, 거리(`1.2km`), 영문 레이블(`LIVE`, `TRADE`, `SOLD`, 섹션 헤더 영문) → **IAMAPLAYER**
- 일반 본문, 설명, 한글 레이블, 입력창, 폼 안내문, 소셜 로그인 버튼 → **Pretendard (기본, 별도 클래스 불필요)**
- h1~h6 태그, 섹션 타이틀, 내비게이션 메뉴, 버튼 레이블, 카드 대형 제목, empty state 타이틀 → **Giants (font-display)**

**CSS 자동 처리 (별도 클래스 불필요)**

- `h1~h6` 태그 → CSS `@layer base`에서 Giants 자동 적용
- `button` 태그 → CSS `@layer base`에서 Giants 자동 적용
- 일반 텍스트(`p`, `span`, `div`) → html 기본값 Pretendard 자동 적용

**`font-display` 클래스를 명시해야 하는 경우**

```tsx
// h태그가 아닌데 굵고 잘 보여야 할 때
<p className="font-display font-bold text-base">실시간 경매</p>
<span className="font-display font-semibold">필터</span>
<div className="font-display font-bold">최종 결제액</div>
```

**`font-player` 클래스 또는 인라인으로 IAMAPLAYER를 써야 할 때**

```tsx
// 가격, 숫자, 영문 레이블 (한글 절대 금지)
<span className="font-player">₩89,000</span>
<span style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>LIVE 3</span>
<span style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>23/24</span>
```

**허용 폰트 목록 (5종, 이외 추가 금지)**

| 폰트명                    | 파일                               | 역할                                    |
|------------------------|----------------------------------|---------------------------------------|
| `Giants` (Regular 400) | `Giants-Regular.woff2`           | Tier 3 강조 텍스트                         |
| `Giants` (Bold 700)    | `Giants-Bold.woff2`              | Tier 3 강조 헤딩                          |
| `Giants-Inline`        | `Giants-Inline.woff2`            | 히어로 대형 헤딩·장식 디스플레이 전용 (`font-inline`) |
| `IAMAPLAYER`           | `IAMAPLAYER.woff2`               | Tier 1 영문·숫자 전용 (`font-player`)       |
| `Pretendard`           | `Pretendard-*.woff2` (5 weights) | Tier 2 기본 본문 (`font-sans`)            |

**절대 금지**

- 위 5종 외의 폰트 추가 (`JetBrains Mono`, `Inter`, `Roboto` 등)
- IAMAPLAYER에 한글 사용 (폴백 폰트로 깨져 보임)
- Giants-Inline을 로고에 사용 (히어로 헤딩 전용)
- 모노스페이스 필요 시 → `font-mono` (시스템 기본값) 사용

**인라인 fontFamily 작성 규칙**

```tsx
// Tier 1: 영문·숫자 전용 (IAMAPLAYER)
style = {
{
  fontFamily: "'IAMAPLAYER',Giants,sans-serif"
}
}

// Tier 2: 본문 (Pretendard) — 인라인 명시가 필요한 경우에만
style = {
{
  fontFamily: "'Pretendard',Giants,sans-serif"
}
}

// Tier 3: 강조 (Giants) — 인라인 명시가 필요한 경우에만
style = {
{
  fontFamily: "'Giants','Pretendard',sans-serif"
}
}

// 히어로 대형 헤딩 (Giants-Inline + IAMAPLAYER fallback)
style = {
{
  fontFamily: "'Giants-Inline','IAMAPLAYER',Giants,sans-serif"
}
}

// 금지 예시
style = {
{
  fontFamily: "'Bebas Neue',sans-serif"
}
}   // 금지 (제거됨)
style = {
{
  fontFamily: "'DM Sans',sans-serif"
}
}       // 금지 (제거됨)
```

**새 폰트 추가 절차** (허가 후에만)

1. `src/index.css`에 `@font-face` 또는 `@import` 추가
2. `tailwind.config.ts`의 `fontFamily`에 등록
3. 이 표에 행 추가 + memory.md 기록

### 브랜드 로고 규칙 <!-- 2026-05-08 -->

**로고 워드마크(`RE:FORM`)는 반드시 아래 중 하나만 사용한다.**

1. **벡터 SVG** — `public/` 또는 `src/assets/` 에 저장된 로고 파일 (`logo.svg` 등)
2. **IAMAPLAYER 폰트** — 숫자·영문 전용 스포티 디스플레이 폰트로 로고 텍스트 렌더링

```tsx
// 올바른 예 — IAMAPLAYER 폰트로 로고 텍스트
<div style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '4px'}}>
  RE:<span style={{color: 'var(--color-accent)'}}>FORM</span>
</div>
```

**Giants-Inline은 로고에 사용 금지** — 히어로 헤딩·장식 디스플레이 전용이며,
브랜드 아이덴티티(로고)와 혼재되면 타이포 일관성이 무너짐.

### 다크모드

- **모든 페이지·컴포넌트에 다크모드 기본 탑재**
- 색상은 반드시 CSS 변수(`--color-*`) 사용 — 하드코딩 hex 금지
- 하드코딩이 불가피한 경우(그라디언트 등) 라이트/다크 양쪽 값 모두 명시
- Tailwind `.dark` 클래스 기반 (darkMode: 'class')

### CSS 변수 사용 규칙

올바른 변수명 레퍼런스:

- 브랜드 컬러: `--color-primary` (navy) / `--color-accent` (red) / `--color-gold`
- 텍스트: `--color-text-main` / `--color-text-sub` / `--color-text-hint`
- 배경: `--color-bg` / `--color-surface` / `--color-surface-sunken` / `--color-surface-raised`
- 보더: `--color-border` / `--color-border-strong`
- 상태: `--color-success` / `--color-error` / `--color-warning` / `--color-info`
- 존재하지 않는 변수: `--color-navy-900` (→ `--color-primary`), `--color-red-500` (→ `--color-accent`)
- Tailwind 그림자: `shadow-btn-accent` / `shadow-card` (CSS 변수 방식 `shadow-[var(--shadow-*)]` 사용 금지)

### 컬러 역할 분리 규칙 (인터랙티브 상태) <!-- 2026-05-08 -->

#### primary vs accent 사용 구분

`--color-primary` (navy)와 `--color-accent` (red)는 역할이 다르다.
다크모드에서 `--color-primary`는 `#1A3051` (어두운 navy)로 전환되어 dark surface 위에서 **묻혀 안 보임**.
`--color-accent` (red `#FF2E4D`)는 라이트/다크 모두에서 항상 선명하게 보임.

| 용도                     | 올바른 변수                  | 잘못된 변수                         |
|------------------------|-------------------------|--------------------------------|
| 활성 탭 텍스트/아이콘           | `--color-accent`        | ~~`--color-primary`~~          |
| 활성 탭 pill 배경           | `--color-accent-subtle` | ~~`--color-primary-subtle`~~   |
| 내비게이션 활성 언더바           | `--color-accent`        | ~~`--color-primary`~~          |
| Link/버튼 hover 텍스트      | `--color-accent`        | ~~`--color-primary`~~          |
| 버튼 배경 (primary action) | `--color-primary`       | -                              |
| 가격 텍스트                 | `--color-primary`       | `--color-accent` (red는 가격에 금지) |
| 브랜드 크롬 (헤더 배경 등)       | `--color-primary`       | -                              |

#### Link 컴포넌트 hover 주의사항

전역 CSS에 `a:hover { color: var(--color-accent-hover) }` 가 선언되어 있음.
Link에 버튼 스타일을 입힐 때 hover 텍스트 색이 덮어씌워지므로 **반드시 `hover:text-{color}`를 명시**할 것.

```tsx
// 올바른 예 — hover:text-white 명시
<Link className="bg-[var(--color-accent)] text-white hover:text-white ...">

  // 잘못된 예 — hover 시 전역 a:hover에 의해 텍스트가 빨개짐
  <Link className="bg-[var(--color-accent)] text-white ...">
```

#### 다크모드 컬러 검증 체크리스트

컴포넌트 작성 후 다음 항목을 반드시 확인할 것:

- [ ] 활성/선택 상태에 `--color-primary` 직접 사용 없음
- [ ] 텍스트 색이 배경색과 충분히 대비됨 (라이트/다크 양쪽)
- [ ] Link 컴포넌트에 `hover:text-{color}` 명시됨
- [ ] 하드코딩 hex 없음 (그라디언트 제외)

## WebStorm 빨간줄 방지 규칙 !!! <!-- 2026-05-14 -->

WebStorm은 ESLint error + TypeScript 타입 에러를 빨간줄로 표시한다.
아래 규칙을 준수하면 빨간줄 0 상태를 유지할 수 있다.

### 규칙 1: import한 것은 반드시 사용할 것

```tsx
// 금지 — 사용하지 않는 import
import {Clock, User} from 'lucide-react'  // Clock/User를 JSX에서 안 씀

// 올바른 예 — 실제로 사용하는 것만 import
import {CheckCircle2, ShieldCheck} from 'lucide-react'
```

- 컴포넌트 작성 완료 후 import 목록과 실제 사용 여부 대조 필수
- `@typescript-eslint/no-unused-vars` 룰이 error 수준 → 미사용 import/변수 즉시 빨간줄

### 규칙 2: NUL 바이트 절대 삽입 금지

- 파일에 NUL(`\x00`) 바이트가 섞이면 ESLint가 `Parsing error: Invalid character` 에러 발생
- bash heredoc / Python write 후 반드시 확인:
  ```bash
  grep -c $'\x00' 파일경로   # 0 이어야 정상
  ```
- 발생 시 복구: `python3 -c "open('f','wb').write(open('f','rb').read().replace(b'\x00',b''))"`

### 규칙 3: 변수 선언 시 타입 명시 또는 추론 가능하게

```tsx
// 금지 — any 암시적 사용
function process(data) { ...
}          // parameter 'data' implicitly has 'any' type

// 올바른 예
function process(data: Record<string, unknown>) { ...
}
```

### 규칙 4: 컴포넌트 Props 타입은 반드시 정의

```tsx
// 금지 — props 타입 없음
function Card({title, price}) { ...
}

// 올바른 예
function Card({title, price}: { title: string; price: number }) { ...
}
```

### 규칙 5: useCallback deps 배열 정확히 선언

```tsx
// react-hooks/exhaustive-deps 위반 → warning (WebStorm에서 노란줄)
const fn = useCallback(() => {
  doSomething(value)
}, [])       // value 누락

// 올바른 예
const fn = useCallback(() => {
  doSomething(value)
}, [value])
```

### 규칙 6: 도메인 개념 변경 시 관련 파일 전부 함께 수정

- 예: `league` 개념 제거 → types/listing.ts + 모든 페이지 + API 타입 동시 수정
- 부분 수정 = 타입 불일치 에러 → 빨간줄 폭발
- 제거 후 반드시 `grep -rn "구 키워드" src/` 로 잔재 확인

### ESLint 에러/워닝 레벨 요약

| 규칙                                        | 수준    | 증상          |
|-------------------------------------------|-------|-------------|
| `@typescript-eslint/no-unused-vars`       | error | 빨간줄         |
| `react-hooks/exhaustive-deps`             | warn  | 노란줄         |
| `no-restricted-syntax` (CSS var in style) | warn  | 노란줄         |
| `Parsing error` (NUL 바이트 등)               | error | 빨간줄 + 파싱 불가 |
| TypeScript 타입 불일치                         | error | 빨간줄         |
