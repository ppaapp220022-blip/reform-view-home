# re:form — Claude 프로젝트 메모리
> 세션 시작 시 반드시 이 파일을 먼저 읽을 것.
> 작업 완료 후 변경사항 업데이트할 것.

---

## 프로젝트 개요
- **서비스명**: re:form (스포츠 용품 리셀 마켓)
- **컨셉**: Sporty + Sophisticated + Trustworthy
- **작업 폴더**: `C:\Users\polar\WebstormProjects\re-form_view`
- **유저**: MJ (polarprince333@gmail.com)

## 기술 스택
- React 19 + Vite 8 + TypeScript 6
- Tailwind CSS 3.4.19 + PostCSS + Autoprefixer
- `@vitejs/plugin-react` + `@rolldown/plugin-babel` (React Compiler 활성화)
- ESLint 10 + typescript-eslint

## 핵심 컬러 (Primitive)
- Navy: `#002147` / `#1A3051` / `#343F5B`
- Red (Point): `#FF2E4D`
- Gold: `#FFB800` | Green(neon): `#00FFAB`
- Success: `#00B36E` | Warning: `#FF9500` | Info: `#0EA5E9`

## 폰트
- Display: `Bebas Neue` (Google Fonts) — h1, 로고
- Body: `DM Sans` (Google Fonts) + `Pretendard` (로컬 fallback, Korean)
- Mono: JetBrains Mono / Fira Code

## 파일 구조 (주요)
```
re-form_view/
├── .claude/
│   └── memory.md          ← 이 파일
├── planning/
│   ├── reform_desktop_wireframe.html
│   └── reform_desktop_wireframe_part2.html
├── src/
│   ├── index.css          ← 디자인 시스템 (3-Layer Token)
│   ├── main.tsx           ← import './index.css' 연결됨
│   ├── App.tsx
│   └── styles/
│       └── fonts.css      ← Pretendard @font-face 선언
├── public/fonts/          ← Pretendard woff/woff2 파일
├── tailwind.config.ts     ← CSS변수 연결, satisfies Config
├── postcss.config.js      ← tailwindcss + autoprefixer
├── CLAUDE.md              ← 프로젝트 지침 (이 파일 운용 규칙 포함)
├── package.json
├── tsconfig.json          ← references 방식 (app + node 분리)
├── tsconfig.app.json
└── tsconfig.node.json
```

## 완료된 작업 <!-- 2026-05-07 -->
- [done] Tailwind CSS v3.4.19 + PostCSS + Autoprefixer 설치
- [done] `postcss.config.js` 생성
- [done] `src/index.css` — 3-Layer Token 설계 (Primitive / Semantic / Base)
  - 다크모드: `@media (prefers-color-scheme: dark)` + `.dark` 클래스 이중 지원
  - `@layer base` 타이포그래피 / 스크롤바 / 리셋
  - `@layer components` — `.badge-*`, `.card`, `.input-base`, `.logo-text`
- [done] `tailwind.config.ts` 작성
  - `darkMode: 'class'`
  - 컬러: primary/accent/status 모두 CSS var 연결
  - borderRadius: btn/card/modal/badge 시멘틱 별칭
  - boxShadow: navy 계열 컬러드 그림자 + btn-accent 글로우
  - animation: fadeInUp, scaleIn, glowPulse
- [done] `tsc --noEmit` 검증 통과
- [done] React 설치 이후 손상된 파일들 복구 (package.json, tsconfig.json, index.css)

## 알려진 버그 / 주의사항
- **Write 툴 truncation**: CSS 파일 등 큰 파일 작성 시 마운트 경계에서 잘림 → bash `cat > file << 'EOF'` 사용
- **package.json truncation**: React 설치 중 손상 가능 → bash로 직접 덮어쓸 것
- **npm install 심볼릭 링크 오류**: 마운트된 Windows 폴더에서 `.bin/` symlink 생성 실패 → `node_modules`에 직접 설치되면 동작은 함

## 다음 할 일 (TODO)
- [ ] `src/styles/fonts.css` Pretendard → `index.css`로 통합 또는 `main.tsx`에서 import 추가
- [ ] 컴포넌트 작업 시작 (레이아웃, GNavi, 상품카드 등)
- [ ] `App.tsx` 초기 레이아웃 구성

## 디자인 시스템 파일 구조 <!-- 2026-05-07 -->

### Claude 참조 문서 (.claude/design-system/)
- `README.md` — 브랜드 가이드 전문 (컬러·타이포·레이아웃·카피 규칙 모두 포함)
- `SKILL.md` — 에이전트용 스킬 매니페스트 (작업 시작 전 확인 권장)
- `colors_and_type.css` — 스탠드얼론 토큰 CSS (Tailwind 불필요, 빠른 HTML 프로토타입용)
- `ui-kits/desktop/` — 데스크탑 UI Kit JSX (DesktopNav, DesktopScreens, Listing, Shared)
- `ui-kits/mobile/` — 모바일 UI Kit JSX (Navigation, Screens, Listing, Shared)
  - !!! `.jsx` 파일이므로 빌드 대상 아님 — 컴포넌트 작업 시 참조/영감 소스로만 활용
  - TSX 변환 시 props에 타입 추가 + import 정리 필요

### 폰트 (public/fonts/)
- `IAMAPLAYER.woff2` — 추가됨 [done] (영문·숫자 전용 스포티 디스플레이)
- `Pretendard-{Regular/Medium/SemiBold/Bold/ExtraBold}.woff2` — 기존
- index.css @font-face 경로 `/fonts/*.woff2` → Vite dev서버 및 빌드 모두 자동 서빙 OK

### 브랜드 에셋 (public/assets/)
- `re-form_icon.png` — 메인 아이콘 1254×1254 (신뢰 가능한 것)
- `re-form_icon.svg`, `re-form_logo_main.svg`, `re-form_logo_simple.svg` — !!! 래퍼 SVG (벡터 원본 없음, 깨진 상태)
- 코드에서 참조 시: `<img src="/assets/re-form_icon.png" />` 형태로 사용

### 핵심 주의사항 (디자인 시스템 룰)
- IAMAPLAYER: 영문·숫자·라틴 기호만 → 한글 절대 금지 (폴백이 Bebas Neue로 어색해짐)
- 레드(#FF2E4D): Hot CTA·라이브 뱃지·에러 전용 — 가격 표시에 레드 금지 (가격은 navy)
- 골드·네온그린: trophy/special-mode 전용 — 남발 금지
- 그림자는 navy 계열 rgba(0,33,71,...) — 블랙 그림자 쓰지 말 것
- 호버: opacity 페이드 금지 (disabled처럼 보임) → border/shadow 변경으로 처리

---

## 프로젝트 전체 기획 <!-- 2026-05-07 -->

### 서비스 개요
- **URL**: reform.co.kr (프론트: React/Vite, 백: Spring Boot + JPA)
- **포트폴리오 프로젝트** — 직접 구현 가능한 수준으로 설계 축소
- `re-form_view` = React 프론트엔드 뷰 레이어 (현재 작업 중인 레포)

### 화면 구성 (총 17개)
**Part 1 (reform_desktop_wireframe_DS.html)**
1. 홈 피드 — GNav + Sport Category Bar + Hero + 사이드바 + 상품 그리드 + 경매 섹션
2. 판매글 상세 — 이미지 갤러리 + 상품정보 + 등급 가이드 + 거래 상태바 + 판매자 정보
3. 판매글 작성 — AI 보조 (AI 설명 추천 + 위험 탐지) + 사이드 프리뷰
4. 검색 결과 — 필터 사이드바 + 그리드
5. 채팅 — 채팅 목록 + 채팅 본문 + 거래 상태바 + 안전 배너 + 거래 액션바
6. 결제 — 토스페이/카카오페이/신용카드/계좌이체 + 에스크로 안내 + 수수료 breakdown
7. 마이페이지 — 프로필 + 활동포인트/매너점수 + 거래관리 + 정산 포인트 출금
8. 커뮤니티 — 게시글 목록 + 작성
9. 관리자 대시보드 — 신고/회원/게시글/출금/분쟁 관리

**Part 2 (reform_desktop_wireframe_part2_DS.html)**
10. 로그인 — 이메일 + 카카오/구글 소셜 로그인
11. 회원가입 — 이메일 기반 + NFR-L01
12. 온보딩 — 관심 종목·구단 설정 (UC-MEM-005)
13. 판매글 수정/삭제 — 거래 진행 중 제약 처리
14. 구매 확정 + 거래 완료
15. 매너 평가 작성 (거래 후)
16. 관리자 — 회원 관리 상세 (경고/정지/탈퇴)
17. 관리자 — 분쟁 처리 상세

### DB 설계 (18개 테이블, reform_project_schema_summary.md)
```
users / user_social_account / user_preference
listing / listing_image / listing_like
chat_room / chat_message
trade / trade_review
payment / point_transaction / withdraw_request
community_post / community_comment / post_like
report / notification
```
- 경매 제외, JWT/Redis 제외, AI 벡터 저장 제외 (포폴 수준 축소)
- 지역/종목/팀 = 코드 테이블 없이 문자열 컬럼
- ERD: planning/reform_project_schema_summary.md 내 mermaid 다이어그램 참고

### 백엔드 패키지 구조 (Spring Boot + JPA)
`com.reform` — global(config/auth/common/infra) + domain(user/listing/chat/trade/payment/community/report/notification) + admin

### 핵심 특수 기능
- **AI 사기 탐지**: 판매글 작성 시 위험 문구·허위매물 실시간 차단
- **AI 설명 보조**: 판매글 작성 AI 추천 패널 (UC-TRD-001, AI-001/002)
- **에스크로 안전결제**: 구매 확정 전 RE:FORM이 결제금 보관
- **토스페이 연동**: 결제 수단 (카카오페이/신용카드/계좌이체도 지원)
- **소셜 로그인**: 카카오 + 구글 OAuth
- **활동 포인트 + 정산 포인트**: 별도 운용, 출금 요청(withdraw_request)으로 처리
- **매너 평가**: 거래 완료 후 별점 + 후기

### 현재 작업 범위 (프론트엔드)
- 컴포넌트 구현 순서 아직 미정
- 참고: `.claude/design-system/ui-kits/` JSX 파일 (desktop/mobile 각 4개)
- 와이어프레임: `planning/reform_desktop_wireframe_DS.html` (1-9번 화면)
- 와이어프레임: `planning/reform_desktop_wireframe_part2_DS.html` (10-17번 화면)

---

## 기술 스택 확정 <!-- 2026-05-07 -->
- [done] React Router v7 (`react-router-dom`) 설치 및 `src/router.tsx` 생성
- [done] Zustand 설치 → `src/store/authStore.ts` (JWT 토큰 복원 포함)
- [done] Axios 설치 → `src/lib/axios.ts` (요청/응답 인터셉터 포함)
- [done] TanStack Query v5 설치 → `src/lib/queryClient.ts`

## src 폴더 구조 확정 <!-- 2026-05-07 -->
- [done] Feature-based 구조 생성 (features/auth, listing, chat, trade, payment, community, mypage, admin)
- [done] components/ui, components/layout, pages, hooks, store, lib, types, utils 생성
- [done] `App.tsx` → QueryClientProvider + RouterProvider 진입점으로 교체
- [done] `src/router.tsx` → 17개 화면 라우트 정의 (Placeholder 상태)
- [done] `App.css` → 보일러플레이트 제거

## 다음 할 일 업데이트 <!-- 2026-05-07 -->
- [ ] 공통 Layout 컴포넌트 구현 (GNB + 콘텐츠 영역)
- [ ] 공통 UI 컴포넌트 구현 (Button, Badge, Input, Card 등)
- [ ] 홈 피드 페이지 구현 (HomePage.tsx) — 첫 번째 실제 화면
- [ ] 백엔드 API 연동 전 MSW(Mock Service Worker) 또는 목 데이터로 개발 진행 여부 결정

## Layout 구현 완료 <!-- 2026-05-07 -->
- [done] `lucide-react` 설치
- [done] `src/components/layout/GNB.tsx` — sticky 헤더, 로고/nav/검색/아이콘/판매하기
- [done] `src/components/layout/Footer.tsx` — 링크 그리드 + IAMAPLAYER 카피라이트
- [done] `src/components/layout/MainLayout.tsx` — GNB + Outlet + Footer
- [done] `src/components/layout/AuthLayout.tsx` — 로고만, 콘텐츠 수직 중앙
- [done] `src/router.tsx` — Outlet 기반 중첩 라우트 (MainLayout / AuthLayout 분리)
- 다음: 로그인 페이지 (LoginPage.tsx)

## Logo 컴포넌트 작업 완료 <!-- 2026-05-07 -->
- [done] `src/components/ui/Logo.tsx` 생성 (variant: main/simple, height prop)
- [done] GNB.tsx → Logo variant="main" height={28}
- [done] Footer.tsx → Logo variant="simple" height={24}
- [done] AuthLayout.tsx → Logo variant="main" height={26}
- [done] `.claude/design-system/README.md` — ## LOGO USAGE 섹션 추가, SVG 상태 주석 업데이트
- !!! 현재 SVG 2종은 PNG 임베드 래퍼 — CSS 색상 변경 불가, 라이트 배경 전용
- 다음: 로그인 페이지 (LoginPage.tsx)

## Logo 다크모드 업데이트 <!-- 2026-05-07 -->
- [done] `re-form_logo_main_dark.svg` 추가됨 (라이트와 동일 비율 1822×430)
- [done] `re-form_logo_simple.svg` — 라이트/다크 겸용 단일 파일 (변경 없음)
- [done] `Logo.tsx` — useDarkMode 훅 추가
  - Tailwind .dark 클래스 MutationObserver 감시
  - OS prefers-color-scheme 감시
  - variant="main" → 다크모드 시 main_dark.svg 자동 전환
  - variant="simple" → 항상 단일 파일 (분기 없음)
- 다음: 로그인 페이지 (LoginPage.tsx)

## 코드 스타일 지침 추가 + 버그 수정 <!-- 2026-05-07 -->
- [done] CLAUDE.md에 스타일 지침 추가 (이모지 금지 / Lucide 사용 / 다크모드 필수 / CSS 변수 규칙)
- [done] GNB.tsx 버그 수정
  - `--color-red-500` (없음) → `--color-accent`
  - `--color-navy-900` (없음) → `--color-primary`
  - `shadow-[var(--shadow-btn-accent)]` (없음) → `shadow-btn-accent`
  - `<kbd>` 단축키 힌트 제거
  - 검색창 input → div+span으로 교체 (클릭 시 /search 이동)
- [done] Footer.tsx / router.tsx / Logo.tsx 동일 변수 교정
- [done] 소스 전체 이모지 제거
- 다음: 로그인 페이지 (LoginPage.tsx)

## GNB 버그 수정 + 다크모드 토글 <!-- 2026-05-07 -->
- [done] 판매하기 hover 글자 빨개지는 버그 수정
  - 원인: 전역 CSS `a:hover { color: var(--color-accent-hover) }` 상속
  - 해결: `hover:text-white` 명시 추가 (유틸리티 레이어가 베이스 레이어보다 우선)
  - 교훈: Link 컴포넌트에 버튼 스타일 입힐 때 항상 hover:text-{color} 명시 필요
- [done] `src/hooks/useTheme.ts` 생성 (localStorage + OS 기반, html.dark 클래스 토글)
- [done] `src/components/ui/ThemeToggle.tsx` 생성 (Sun/Moon 아이콘, 판매하기 오른쪽 배치)
- [done] `App.tsx` — useTheme() 최상단 초기화 추가
- 다음: 로그인 페이지 (LoginPage.tsx)

## 모바일 반응형 레이아웃 완료 <!-- 2026-05-08 -->
- [done] `BottomTabBar.tsx` — 모바일 전용 하단 탭 5개 (HOME/SEARCH/SELL/CHAT/MY)
- [done] `MainLayout.tsx` 업데이트
  - BottomTabBar import 추가
  - main에 `pb-16 md:pb-0` — 탭바에 콘텐츠 가림 방지
  - Footer → `hidden md:block` 래퍼로 감싸 모바일에서 숨김
  - BottomTabBar는 컴포넌트 내부에서 `md:hidden` 처리
- 판매하기 버튼 shadow 없음 (이전 세션에서 이미 제거됨)
- 다음: 로그인 페이지 (LoginPage.tsx)

## 컬러 역할 분리 규칙 확립 <!-- 2026-05-08 -->
- [done] CLAUDE.md — "컬러 역할 분리 규칙" 섹션 추가
- [done] design-system/README.md — "COLOR ROLE RULES" 섹션 추가
- 핵심 규칙:
  - `--color-primary` (navy): 버튼 배경/가격/브랜드 크롬 전용. 다크모드 dark surface에서 묻힘 → 인터랙티브 active에 금지
  - `--color-accent` (red): 활성 탭/hover/CTA — 라이트/다크 양쪽 항상 선명. 가격 텍스트에는 금지
  - Link 컴포넌트에 항상 `hover:text-{color}` 명시 필수 (전역 a:hover 덮어씌움 방지)
- GNB 활성 탭 텍스트 + BottomTabBar 활성 탭: 모두 accent로 통일 완료

## 로그인 페이지 구현 완료 <!-- 2026-05-08 -->
- [done] `src/features/auth/api/authApi.ts` — loginWithEmail / redirectToKakao / redirectToGoogle
- [done] `src/features/auth/hooks/useLogin.ts` — useMutation 래퍼, 성공 시 authStore 저장 + 홈 이동
- [done] `src/pages/auth/LoginPage.tsx` — 브랜드 패널(좌) + 폼 패널(우), 반응형, 다크모드
  - 카카오(#FEE500) / 구글(멀티컬러 G) 소셜 버튼
  - 이메일+비밀번호 폼, 비밀번호 표시 토글 (Eye/EyeOff)
  - 로그인 유지 체크박스 + 비밀번호 찾기 링크
  - 401/429 서버 에러 메시지 인라인 표시
  - 모바일: 브랜드 패널 hidden, 폼 단일 컬럼
- [done] `src/router.tsx` — `/login` Placeholder → LoginPage 교체
- [done] `tsc --noEmit` 통과 (에러 없음)
- 다음: 회원가입 페이지 (RegisterPage.tsx) 또는 홈 피드

## 회원가입 페이지 구현 완료 <!-- 2026-05-08 -->
- [done] `authApi.ts` — registerWithEmail / checkNickname 추가
- [done] `useRegister.ts` — useMutation, 성공 시 authStore 저장 + /onboarding 이동
- [done] `src/pages/auth/RegisterPage.tsx` — Step 1 (계정정보)
  - 3단계 StepIndicator 컴포넌트 (done/active/pending 상태)
  - 이메일 형식 실시간 검증 (green/red dot)
  - 닉네임 2~20자 검증
  - 비밀번호 강도 바 (4단계: 매우약함/약함/보통/강함)
  - 비밀번호 확인 일치 여부 (CheckCircle2/Circle 아이콘)
  - 약관 동의 섹션 (전체동의 + 필수2 + 선택1)
  - 409/400 서버 에러 인라인 표시
- [done] router.tsx — /register Placeholder → RegisterPage 교체
- [done] tsc --noEmit 통과
- 다음: 온보딩 페이지 (관심 종목/팀 설정, Step 2) 또는 홈 피드

## 회원가입/로그인 개선 <!-- 2026-05-08 -->
- [done] AuthLayout — 상단 로고 블록 제거 (콘텐츠 영역만 남김)
- [done] TermsModal.tsx 생성 (src/components/ui/)
  - 이용약관 / 개인정보처리방침 전문 표시
  - ESC 키 닫기, body 스크롤 잠금, 오버레이 클릭 닫기
- [done] RegisterPage 전면 재작업
  - 상단 3px navy 액센트 바 + shadow-card 카드 레이아웃
  - 내부에 IAMAPLAYER 로고 워드마크 (로고 이미지 대신)
  - 비밀번호 요건 체크리스트 (8자/대문자/숫자/특수문자, 체크마크)
  - 약관 보기 버튼 → TermsModal 연결
  - max-w-[560px]

## 홈 피드 구현 완료 <!-- 2026-05-08 -->
- [done] RegisterPage 약관 필수/선택 배지 제거 (동일 스타일로 통일)
- [done] `src/types/listing.ts` — ListingItem/AuctionItem/HomeFilter 공통 타입
- [done] `src/pages/HomePage.tsx` — 홈 피드 전체 구현
  - SportCategoryBar: 종목 탭(7개) + 리그 칩, sticky GNB 아래
  - HeroSection: navy 배경, IAMAPLAYER 제목, 유니폼 SVG 일러스트, 통계 4개
  - FilterSidebar: 리그/컨디션/거래방식 필터 (md 이상 표시)
  - ProductCard: 유니폼 SVG + 등급배지 + 찜버튼 + 가격(primary색)
  - 상품 그리드: 2(모바일)/3(md)/4(lg)/5(xl)열 반응형
  - 빈 결과 empty state 처리
  - AuctionSection: LIVE 배지 + 타이머 + navy 하단 바, 3열 그리드
  - 클라이언트 사이드 필터링 (목 데이터 10개 상품 + 3개 경매)
- [done] router.tsx — / Placeholder → HomePage 교체
- [done] tsc --noEmit 통과
- 다음: 상품 상세 페이지 (ListingDetailPage) 또는 검색 결과 페이지
