/**
 * router.tsx — 클라이언트 라우트 정의
 *
 * 레이아웃 구조:
 *   MainLayout  → GNB + Footer 있는 일반 페이지
 *   AuthLayout  → 로그인/회원가입/온보딩 (GNB 없음)
 *   AdminLayout → 관리자 사이드바 + 라우트 가드 (ROLE_ADMIN 전용)
 */
import {createBrowserRouter} from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'
import AdminLayout from './components/layout/AdminLayout'

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import OnboardingPage from './pages/auth/OnboardingPage'
import WelcomePage from './pages/auth/WelcomePage'
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage'

// ── 메인 ─────────────────────────────────────────────────────────────────────
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'

// ── 검색 ─────────────────────────────────────────────────────────────────────
import SearchPage from './pages/search/SearchPage'

// ── 판매글 ───────────────────────────────────────────────────────────────────
import ListingDetailPage from './pages/listing/ListingDetailPage'
import ListingCreatePage from './pages/listing/ListingCreatePage'
import ListingEditPage from './pages/listing/ListingEditPage'

// ── 마이페이지 ────────────────────────────────────────────────────────────────
import MyPage from './pages/mypage/MyPage'

// ── 채팅 ─────────────────────────────────────────────────────────────────────
import ChatPage from './pages/chat/ChatPage'

// ── 커뮤니티 ─────────────────────────────────────────────────────────────────
import CommunityPage from './pages/community/CommunityPage'
import CommunityDetailPage from './pages/community/CommunityDetailPage'

// ── 결제 / 거래 ──────────────────────────────────────────────────────────────
import PaymentPage from './pages/payment/PaymentPage'
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage'
import PaymentFailPage from './pages/payment/PaymentFailPage'
import TradePage from './pages/trade/TradePage'
import TradeConfirmPage from './pages/trade/TradeConfirmPage'
import ReviewPage from './pages/trade/ReviewPage'

// ── 관리자 ───────────────────────────────────────────────────────────────────
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminMembersPage from './pages/admin/AdminMembersPage'
import AdminMemberDetailPage from './pages/admin/AdminMemberDetailPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminReportDetailPage from './pages/admin/AdminReportDetailPage'
import AdminDisputesPage from './pages/admin/AdminDisputesPage'
import AdminDisputeDetailPage from './pages/admin/AdminDisputeDetailPage'
import AdminListingPage from './pages/admin/AdminListingPage'
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage'

const router = createBrowserRouter([
  // ── 인증 레이아웃 (GNB 없음) ──────────────────────────────────────────────
  {
    element: <AuthLayout/>,
    children: [
      {path: '/login', element: <LoginPage/>},
      {path: '/register', element: <RegisterPage/>},
      {path: '/onboarding', element: <OnboardingPage/>},
      {path: '/welcome', element: <WelcomePage/>},
      {path: '/oauth/callback', element: <OAuthCallbackPage/>},
    ],
  },
  
  // ── 메인 레이아웃 (GNB + Footer) ──────────────────────────────────────────
  {
    element: <MainLayout/>,
    children: [
      // 메인 / 검색
      {path: '/', element: <HomePage/>},
      {path: '/search', element: <SearchPage/>},
      {path: '/likes', element: <MyPage/>},   // 찜 목록 → MyPage 찜 탭으로 통합
      
      // 판매글
      {path: '/listing/new', element: <ListingCreatePage/>},
      {path: '/listing/:id', element: <ListingDetailPage/>},
      {path: '/listing/:id/edit', element: <ListingEditPage/>},
      
      // 거래 / 결제
      {path: '/trade/:id', element: <TradePage/>},
      {path: '/trade/:id/confirm', element: <TradeConfirmPage/>}, // 구버전 URL 호환
      {path: '/trade/:id/review', element: <ReviewPage/>},
      {path: '/payment/:id', element: <PaymentPage/>},
      {path: '/payment/success', element: <PaymentSuccessPage/>},
      {path: '/payment/fail', element: <PaymentFailPage/>},
      
      // 채팅
      {path: '/chat', element: <ChatPage/>},
      
      // 마이페이지
      {path: '/mypage', element: <MyPage/>},
      
      // 커뮤니티
      {path: '/community', element: <CommunityPage/>},
      {path: '/community/:id', element: <CommunityDetailPage/>},
      
      // 404
      {path: '*', element: <NotFoundPage/>},
    ],
  },
  
  // ── 관리자 레이아웃 (ROLE_ADMIN 전용 가드 포함) ────────────────────────────
  {
    element: <AdminLayout/>,
    children: [
      {path: '/admin', element: <AdminDashboardPage/>},
      {path: '/admin/members', element: <AdminMembersPage/>},
      {path: '/admin/members/:id', element: <AdminMemberDetailPage/>},
      {path: '/admin/listings', element: <AdminListingPage/>},
      {path: '/admin/reports', element: <AdminReportsPage/>},
      {path: '/admin/reports/:id', element: <AdminReportDetailPage/>},
      {path: '/admin/disputes', element: <AdminDisputesPage/>},
      {path: '/admin/disputes/:id', element: <AdminDisputeDetailPage/>},
      {path: '/admin/withdrawals', element: <AdminWithdrawalsPage/>},
    ],
  },
])

export default router
