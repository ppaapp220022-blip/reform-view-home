/**
 * router.tsx — 클라이언트 라우트 정의
 *
 * 레이아웃 구조:
 * - MainLayout  → GNB + Footer 있는 일반 페이지
 * - AuthLayout  → 로그인/회원가입/온보딩 (GNB 없음)
 *
 * 페이지 구현 시:
 *   1. src/pages/에 컴포넌트 생성
 *   2. 아래 import 주석 해제 + element 교체
 */
import { createBrowserRouter } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import HomePage from './pages/HomePage'

// ── 구현된 페이지 import (추가되면 여기에) ──────────────────────────────────
// ...

/** 미구현 페이지 임시 플레이스홀더 */
const Placeholder = ({ name }: { name: string }) => (
  <div className="max-w-[1280px] mx-auto px-7 py-16">
    <h1
      className="text-4xl text-[var(--color-primary)] mb-2"
      style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif", letterSpacing: '0.04em' }}
    >
      {name}
    </h1>
    <p className="text-[var(--color-text-sub)] text-sm">페이지 구현 중...</p>
  </div>
)

const router = createBrowserRouter([
  // ── 인증 레이아웃 (GNB 없음) ──────────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/login',      element: <LoginPage /> },
      { path: '/register',   element: <RegisterPage /> },
      { path: '/onboarding', element: <Placeholder name="온보딩" /> },
    ],
  },

  // ── 메인 레이아웃 (GNB + Footer) ──────────────────────────────────────────
  {
    element: <MainLayout />,
    children: [
      // 메인
      { path: '/',       element: <HomePage /> },
      { path: '/search', element: <Placeholder name="검색 결과" /> },
      { path: '/likes',  element: <Placeholder name="관심 목록" /> },

      // 판매글
      { path: '/listing/new',      element: <Placeholder name="판매글 작성" /> },
      { path: '/listing/:id',      element: <Placeholder name="판매글 상세" /> },
      { path: '/listing/:id/edit', element: <Placeholder name="판매글 수정" /> },

      // 거래 / 결제
      { path: '/trade/:id/confirm', element: <Placeholder name="구매 확정" /> },
      { path: '/trade/:id/review',  element: <Placeholder name="매너 평가" /> },
      { path: '/payment/:id',       element: <Placeholder name="결제" /> },

      // 채팅
      { path: '/chat', element: <Placeholder name="채팅" /> },

      // 마이페이지
      { path: '/mypage', element: <Placeholder name="마이페이지" /> },

      // 커뮤니티
      { path: '/community', element: <Placeholder name="커뮤니티" /> },

      // 관리자
      { path: '/admin',                element: <Placeholder name="관리자 대시보드" /> },
      { path: '/admin/members/:id',    element: <Placeholder name="회원 관리 상세" /> },
      { path: '/admin/disputes/:id',   element: <Placeholder name="분쟁 처리 상세" /> },

      // 404
      { path: '*', element: <Placeholder name="404 Not Found" /> },
    ],
  },
])

export default router
