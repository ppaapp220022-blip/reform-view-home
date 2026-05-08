코드 작성 시 주석을 상세히 달 것.

## 디자인 시스템 참조 의무 !!!

**UI/시각 관련 작업 시작 전 반드시 아래 파일을 Read할 것.**

| 파일 | 내용 |
|---|---|
| `.claude/design-system/README.md` | 브랜드 가이드 전문 (컬러·타이포·레이아웃·카피 규칙) |
| `.claude/design-system/SKILL.md` | 에이전트용 스킬 매니페스트 |
| `src/index.css` | 실제 CSS 변수 정의 (3-Layer Token) |

적용 범위: 페이지 신규 작성, 컴포넌트 신규 작성, 스타일 편집, 색상·간격·타이포 결정 — 모든 시각적 변경 포함.

**체크리스트 (작업 전 확인)**
- [ ] README.md의 VISUAL FOUNDATIONS, COLOR ROLE RULES 섹션 확인
- [ ] 사용할 CSS 변수가 `src/index.css`에 실제로 존재하는지 확인
- [ ] 다크모드 양쪽(라이트/다크)에서 색상 대비 확인
- [ ] 이모지 없음, 하드코딩 hex 없음, 존재하지 않는 변수명 없음

## 파일 수정 시 주의사항

**Edit 툴은 약 20KB 이상의 파일을 수정할 때 파일을 잘라먹는 버그가 있음.**
- 큰 파일(~20KB 이상) 수정 시에는 Edit 툴 대신 bash(`sed`, `awk`, `cat >>` 등)를 우선 사용할 것
- 수정 후에는 반드시 `grep -n "</html>"` 및 `tail` 로 파일 끝이 정상인지 검증할 것

## 마운트 파일시스템 주의사항

**Write 툴이 Windows↔Linux 마운트 경계에서 파일을 잘라먹는 버그가 있음.**
- `src/index.css` 같은 CSS 파일을 쓸 때는 Write 툴 대신 bash `cat > file << 'EOF'` 방식을 우선 사용할 것
- 파일 작성 후 `wc -l` 로 라인 수가 정상인지 반드시 검증할 것
- `package.json` 이 손상됐을 경우 bash로 직접 덮어쓸 것

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

| 구분 | 라이브러리 |
|---|---|
| 라우터 | react-router-dom v7 (`createBrowserRouter`) |
| 전역 상태 | Zustand (`useAuthStore` 등) |
| HTTP 클라이언트 | Axios (`src/lib/axios.ts` 인스턴스 사용) |
| 서버 상태 | TanStack Query v5 (`src/lib/queryClient.ts`) |
| 스타일 | Tailwind CSS v3 + CSS Variables (디자인 시스템) |

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

| 용도 | 올바른 변수 | 잘못된 변수 |
|---|---|---|
| 활성 탭 텍스트/아이콘 | `--color-accent` | ~~`--color-primary`~~ |
| 활성 탭 pill 배경 | `--color-accent-subtle` | ~~`--color-primary-subtle`~~ |
| 내비게이션 활성 언더바 | `--color-accent` | ~~`--color-primary`~~ |
| Link/버튼 hover 텍스트 | `--color-accent` | ~~`--color-primary`~~ |
| 버튼 배경 (primary action) | `--color-primary` | - |
| 가격 텍스트 | `--color-primary` | `--color-accent` (red는 가격에 금지) |
| 브랜드 크롬 (헤더 배경 등) | `--color-primary` | - |

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
