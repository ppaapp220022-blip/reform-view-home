/**
 * AdminLayout — 관리자 전용 레이아웃 + 라우트 가드
 *
 * 역할:
 *   1. 인증 확인: 비로그인 → /login 리다이렉트
 *   2. 권한 확인: role !== 'ADMIN' → / 리다이렉트
 *   3. 관리자 전용 사이드바 + 상단 헤더 렌더링
 */
import {Link, Navigate, Outlet, useLocation} from 'react-router-dom'
import {
  BarChart3,
  FileText,
  Flag,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  Shield,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useTheme from '../../hooks/useTheme'

// ── 사이드바 네비 아이템 ───────────────────────────────────────────────────────

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {path: '/admin', label: '대시보드', icon: <LayoutDashboard size={16}/>},
  {path: '/admin/members', label: '회원 관리', icon: <Users size={16}/>},
  {path: '/admin/listings', label: '게시글 관리', icon: <FileText size={16}/>},
  {path: '/admin/reports', label: '신고 관리', icon: <Flag size={16}/>},
  {path: '/admin/disputes', label: '분쟁 처리', icon: <MessageSquareWarning size={16}/>},
  {path: '/admin/withdrawals', label: '출금 요청', icon: <Wallet size={16}/>},
  {path: '/admin/risk', label: 'AI 위험 탐지', icon: <ShieldAlert size={16}/>},
]

// ── 사이드바 ─────────────────────────────────────────────────────────────────

/**
 * ThemeToggleRow — 사이드바 전용 테마 토글
 * 사이드바가 navy 배경이므로 아이콘·텍스트를 흰색 계열로 처리
 */
function ThemeToggleRow() {
  const {isDark, toggleTheme} = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-all hover:text-white"
      style={{color: 'rgba(255,255,255,.45)', fontFamily: "'Giants','Pretendard',sans-serif"}}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {/* Sun/Moon SVG 인라인 — 사이드바 navy 배경에서 색 보장 */}
      {isDark ? (
        /* Sun 아이콘 */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        /* Moon 아이콘 */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
      {isDark ? '라이트 모드' : '다크 모드'}
    </button>
  )
}

function AdminSidebar() {
  const location = useLocation()
  const {logout} = useAuthStore()
  const {user} = useAuthStore()
  
  // 현재 경로가 nav 항목과 매칭되는지 확인 (대시보드는 exact, 나머지는 startsWith)
  function isActive(path: string): boolean {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }
  
  return (
    <aside
      className="flex flex-col w-56 flex-shrink-0 min-h-screen"
      style={{
        background: 'var(--color-primary)',
        borderRight: '1px solid rgba(255,255,255,.08)',
      }}
    >
      {/* 로고 */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{borderBottom: '1px solid rgba(255,255,255,.08)'}}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{background: 'var(--color-accent)'}}
        >
          <Shield size={14} style={{color: '#fff'}}/>
        </div>
        <div>
          <p
            className="text-sm font-bold leading-none"
            style={{
              color: '#fff',
              fontFamily: "'IAMAPLAYER',Giants,sans-serif",
              letterSpacing: '0.05em',
            }}
          >
            RE:FORM
          </p>
          <p className="text-[10px] mt-0.5" style={{color: 'rgba(255,255,255,.45)'}}>
            ADMIN
          </p>
        </div>
      </div>
      
      {/* 관리자 프로필 */}
      <div
        className="px-4 py-3 mx-3 mt-4 rounded-xl"
        style={{background: 'rgba(255,255,255,.06)'}}
      >
        <p className="text-xs font-semibold truncate" style={{color: '#fff'}}>
          {user?.nickname ?? '관리자'}
        </p>
        <p className="text-[10px] mt-0.5 truncate" style={{color: 'rgba(255,255,255,.45)'}}>
          {user?.email ?? ''}
        </p>
      </div>
      
      {/* 네비 */}
      <nav className="flex-1 px-3 mt-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:text-white"
            style={{
              background: isActive(item.path) ? 'rgba(255,255,255,.12)' : 'transparent',
              color: isActive(item.path) ? '#fff' : 'rgba(255,255,255,.55)',
              fontFamily: "'Giants','Pretendard',sans-serif",
            }}
          >
            <span style={{color: isActive(item.path) ? 'var(--color-accent)' : 'rgba(255,255,255,.4)'}}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
      
      {/* 하단 — 테마 토글 / 메인 사이트 / 로그아웃 */}
      <div
        className="px-3 py-4 flex flex-col gap-1"
        style={{borderTop: '1px solid rgba(255,255,255,.08)'}}
      >
        <ThemeToggleRow/>
        <Link
          to="/"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all hover:text-white"
          style={{color: 'rgba(255,255,255,.45)', fontFamily: "'Giants','Pretendard',sans-serif"}}
        >
          <BarChart3 size={15} style={{color: 'rgba(255,255,255,.3)'}}/>
          메인 사이트
        </Link>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all hover:text-white"
          style={{color: 'rgba(255,255,255,.45)', fontFamily: "'Giants','Pretendard',sans-serif"}}
        >
          <LogOut size={15} style={{color: 'rgba(255,255,255,.3)'}}/>
          로그아웃
        </button>
      </div>
    </aside>
  )
}

// ── 관리자 헤더 (모바일용 / 데스크탑에서는 숨김) ─────────────────────────────

function AdminMobileHeader() {
  const location = useLocation()
  const currentItem = NAV_ITEMS.find(item =>
    item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path)
  )
  
  return (
    <div
      className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40"
      style={{
        background: 'var(--color-primary)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
      }}
    >
      <div className="flex items-center gap-2">
        <Shield size={16} style={{color: 'var(--color-accent)'}}/>
        <span
          className="text-sm font-bold"
          style={{color: '#fff', fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '0.04em'}}
        >
          ADMIN
        </span>
        {currentItem && (
          <>
            <span style={{color: 'rgba(255,255,255,.3)', margin: '0 4px'}}>/</span>
            <span className="text-sm"
                  style={{color: 'rgba(255,255,255,.7)', fontFamily: "'Giants','Pretendard',sans-serif"}}>
              {currentItem.label}
            </span>
          </>
        )}
      </div>
      <Link to="/" className="text-xs hover:text-white" style={{color: 'rgba(255,255,255,.45)'}}>
        메인으로
      </Link>
    </div>
  )
}

// ── AdminLayout 메인 ─────────────────────────────────────────────────────────

export default function AdminLayout() {
  const {user, isAuthenticated} = useAuthStore()
  
  // 비로그인 → 로그인 페이지
  if (!isAuthenticated) {
    return <Navigate to="/login" replace/>
  }
  
  // 일반 유저 → 홈
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace/>
  }
  
  return (
    <div className="flex min-h-screen" style={{background: 'var(--color-bg)'}}>
      {/* 데스크탑 사이드바 */}
      <div className="hidden md:flex">
        <AdminSidebar/>
      </div>
      
      {/* 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 모바일 헤더 */}
        <AdminMobileHeader/>
        
        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-auto">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
