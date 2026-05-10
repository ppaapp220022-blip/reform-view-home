/**
 * router.tsx — 클라이언트 라우트 정의
 *
 * 레이아웃 구조:
 * - MainLayout  → GNB + Footer 있는 일반 페이지
 * - AuthLayout  → 로그인/회원가입/온보딩 (GNB 없음)
 */
import { createBrowserRouter } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginPage       from './pages/auth/LoginPage'
import RegisterPage    from './pages/auth/RegisterPage'
import OnboardingPage  from './pages/auth/OnboardingPage'
import WelcomePage     from './pages/auth/WelcomePage'

// ── 메인 ─────────────────────────────────────────────────────────────────────
import HomePage        from './pages/HomePage'

// ── 검색 ─────────────────────────────────────────────────────────────────────
import SearchPage      from './pages/search/SearchPage'

// ── 판매글 ───────────────────────────────────────────────────────────────────
import ListingDetailPage from './pages/listing/ListingDetailPage'
import ListingCreatePage from './pages/listing/ListingCreatePage'

// ── 마이페이지 ────────────────────────────────────────────────────────────────
import MyPage          from './pages/mypage/MyPage'

// ── 채팅 ─────────────────────────────────────────────────────────────────────
import ChatPage        from './pages/chat/ChatPage'

// ── 커뮤니티 ─────────────────────────────────────────────────────────────────
import CommunityPage        from './pages/community/CommunityPage'
import CommunityDetailPage from './pages/community/CommunityDetailPage'

// ── 결제 / 거래 ──────────────────────────────────────────────────────────────
import PaymentPage       from './pages/payment/PaymentPage'
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage'
import PaymentFailPage    from './pages/payment/PaymentFailPage'
import TradeConfirmPage  from './pages/trade/TradeConfirmPage'
import ReviewPage        from './pages/trade/ReviewPage'

// ── 판매글 수정 ──────────────────────────────────────────────────────────────
import ListingEditPage    from './pages/listing/ListingEditPage'

// ── 관리자 ───────────────────────────────────────────────────────────────────
import AdminDashboardPage     from './pages/admin/AdminDashboardPage'
import AdminMemberDetailPage  from './pages/admin/AdminMemberDetailPage'
import AdminDisputeDetailPage from './pages/admin/AdminDisputeDetailPage'
import AdminReportDetailPage  from './pages/admin/AdminReportDetailPage'

/** 미구현 페이지 임시 플레이스홀더 */
// eslint-disable-next-line react-refresh/only-export-components
const Placeholder = ({ name }: { name: string }) => (
  <div className="max-w-[1280px] mx-auto px-7 py-16">
    <h1
      className="text-4xl text-[var(--color-primary)] mb-2"
      style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '0.04em' }}
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
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/welcome',    element: <WelcomePage /> },
    ],
  },

  // ── 메인 레이아웃 (GNB + Footer) ──────────────────────────────────────────
  {
    element: <MainLayout />,
    children: [
      // 메인
      { path: '/',       element: <HomePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/likes',  element: <MyPage /> },   // 찜 목록 → MyPage 찜 탭으로 통합

      // 판매글
      { path: '/listing/new',      element: <ListingCreatePage /> },
      { path: '/listing/:id',      element: <ListingDetailPage /> },
      { path: '/listing/:id/edit', element: <ListingEditPage /> },

      // 거래 / 결제
      { path: '/trade/:id/confirm', element: <TradeConfirmPage /> },
      { path: '/trade/:id/review',  element: <ReviewPage /> },
      { path: '/payment/:id',       element: <PaymentPage /> },
      { path: '/payment/success',   element: <PaymentSuccessPage /> },
      { path: '/payment/fail',      element: <PaymentFailPage /> },

      // 채팅
      { path: '/chat', element: <ChatPage /> },

      // 마이페이지
      { path: '/mypage', element: <MyPage /> },

      // 커뮤니티
      { path: '/community',      element: <CommunityPage /> },
      { path: '/community/:id', element: <CommunityDetailPage /> },

      // 관리자
      { path: '/admin',                element: <AdminDashboardPage /> },
      { path: '/admin/members/:id',    element: <AdminMemberDetailPage /> },
      { path: '/admin/disputes/:id',   element: <AdminDisputeDetailPage /> },
      { path: '/admin/reports/:id',    element: <AdminReportDetailPage /> },
    ],
  },
])

export default router
