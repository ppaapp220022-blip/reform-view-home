/**
 * MainLayout — GNB + 콘텐츠 + BottomTabBar(모바일) + Footer(데스크톱) 기본 레이아웃
 *
 * 홈, 마켓, 채팅, 마이페이지, 커뮤니티, 판매글 등
 * GNB가 필요한 모든 일반 페이지에서 사용.
 *
 * 반응형 구조:
 *   모바일 (~md): 상단 GNB(56px) + 콘텐츠 + 하단 BottomTabBar(64px)
 *                 → main에 pb-16 적용해 탭바에 콘텐츠 가림 방지
 *   데스크톱 (md~): 상단 GNB + 콘텐츠 + 하단 Footer
 *                   → BottomTabBar hidden, Footer 표시
 *
 * Router에서 Outlet으로 자식 페이지를 렌더링함.
 */
import { Outlet } from 'react-router-dom'
import GNB from './GNB'
import Footer from './Footer'
import BottomTabBar from './BottomTabBar'

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* 상단 고정 네비게이션 (모바일/데스크톱 공통) */}
      <GNB />

      {/*
       * 페이지 콘텐츠 영역
       * pb-16: 모바일에서 BottomTabBar(64px) 높이만큼 하단 패딩 확보
       * md:pb-0: 데스크톱에서는 패딩 불필요
       */}
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* 하단 탭바 — 모바일 전용 (md 이상에서 숨김, BottomTabBar 내부에서 md:hidden 처리) */}
      <BottomTabBar />

      {/* 하단 푸터 — 데스크톱 전용 (md 미만에서 숨김) */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  )
}
