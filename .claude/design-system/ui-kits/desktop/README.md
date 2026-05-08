# RE:FORM — Desktop Web UI Kit

데스크톱 웹용 UI 키트. 1280px 컨텐츠 너비 + 28px 좌우 패딩.

## Layout
- `DesktopHeader`: sticky 상단 GNB. 로고 / 메뉴 / 메가 검색 (⌘K) / 아이콘 액션 / 판매 CTA
- `DesktopFooter`: 5컬럼 사이트맵 + 카피라이트 (IAMAPLAYER)
- 컨텐츠 max-width 1280, 좌측 240px Filter rail + 우측 4-column 카드 그리드

## Screens (`DesktopScreens.jsx`)
- `HomeScreenD` — Hero 배너 / 카테고리 8그리드 / 정렬 필터 / 4-col 리스팅
- `DetailScreenD` — 좌측 갤러리 + 우측 460px 사이드 패널 (가격, 판매자, 액션 3종) + 본문 + Safe Trade 카드
- `CommunityScreenD` — 게시판 테이블 (CATEGORY / TITLE / AUTHOR / VIEWS / LIKES) + Trending 사이드바

## 공유 컴포넌트
- `Shared.jsx`, `Listing.jsx` 는 mobile UI kit과 **동일한 파일** (Logo, I, Badge, Button, PriceTag, JerseyThumb, ListingCard).
- 다크 모드는 `body[data-theme="dark"]` 속성 셀렉터로 자동 전환 — 자식 컴포넌트는 `data-surface`, `data-text-main`, `data-card` 등 데이터 속성으로 마킹.

## 비포함 / 한계
- 실제 카탈로그 사진은 jersey-number 그라디언트 placeholder.
- 로그인, 결제, 판매 등록 플로우 미포함 (확장 시 `Shared.jsx`의 `Button` + 토큰 기반으로 빠르게 추가 가능).
