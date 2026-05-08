/**
 * GNB (Global Navigation Bar)
 *
 * 반응형 구조:
 *   모바일 (~md): 높이 56px, 로고 + 우측 아이콘(검색/알림/테마토글)만
 *   데스크톱 (md~): 풀 레이아웃 (로고/nav/검색창/아이콘/로그인/판매하기/테마토글)
 *
 * 디자인 룰:
 *   - sticky top, z-20
 *   - 호버: border/shadow 변경 (opacity fade, 배경색 변경 금지)
 *   - Link 버튼: hover:text-{color} 반드시 명시 (전역 a:hover 덮어쓰기)
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Bell, Heart, MessageCircle } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import Logo from '../ui/Logo'
import ThemeToggle from '../ui/ThemeToggle'

const NAV_ITEMS = [
  { id: 'home',      label: '홈',       path: '/' },
  { id: 'market',    label: '마켓',     path: '/search' },
  { id: 'community', label: '커뮤니티', path: '/community' },
] as const

export default function GNB() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const getActiveId = () => {
    if (location.pathname === '/') return 'home'
    if (location.pathname.startsWith('/search')) return 'market'
    if (location.pathname.startsWith('/community')) return 'community'
    return null
  }
  const activeId = getActiveId()

  /** 공통 아이콘 버튼 스타일 */
  const iconBtnCls = 'w-10 h-10 flex items-center justify-center rounded-lg text-[var(--color-text-main)] border border-transparent hover:border-[var(--color-border)] transition-colors'

  return (
    <header className="sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">

      {/* ── 모바일 헤더 (md 미만) ─────────────────────────────────────── */}
      <div className="flex md:hidden items-center h-14 px-4 gap-2">
        <Link to="/" className="inline-flex items-center" aria-label="RE:FORM 홈">
          <Logo variant="main" height={24} />
        </Link>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => navigate('/search')}
            className={iconBtnCls}
            aria-label="검색"
          >
            <Search size={20} />
          </button>
          <button className={iconBtnCls} aria-label="알림">
            <Bell size={20} />
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* ── 데스크톱 헤더 (md 이상) ──────────────────────────────────── */}
      <div className="hidden md:flex items-center max-w-[1280px] mx-auto px-7 py-[14px] gap-7">

        {/* 로고 */}
        <Link to="/" className="inline-flex items-center shrink-0" aria-label="RE:FORM 홈">
          <Logo variant="main" height={28} />
        </Link>

        {/* 메인 네비게이션 */}
        <nav className="flex gap-1">
          {NAV_ITEMS.map(({ id, label, path }) => {
            const isActive = activeId === id
            return (
              <Link
                key={id}
                to={path}
                className={[
                  'relative px-[14px] py-2 rounded-lg text-sm no-underline transition-colors',
                  isActive
                    ? 'text-[var(--color-accent)] font-bold hover:text-[var(--color-accent)]'
                    : 'text-[var(--color-text-sub)] font-semibold hover:text-[var(--color-accent)]',
                ].join(' ')}
              >
                {label}
                {isActive && (
                  <span className="absolute left-[14px] right-[14px] -bottom-[15px] h-0.5 bg-[var(--color-accent)] rounded-sm" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* 검색창 */}
        <div
          className="flex-1 max-w-[520px] ml-3 flex items-center gap-2 bg-[var(--color-surface-sunken)] border border-[var(--color-border)] rounded-full px-4 py-[9px] cursor-text"
          onClick={() => navigate('/search')}
        >
          <Search size={18} className="text-[var(--color-text-sub)] shrink-0" />
          <span className="flex-1 text-sm text-[var(--color-text-hint)] select-none">
            구단·선수·시즌으로 검색
          </span>
        </div>

        {/* 우측 아이콘 영역 */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => navigate('/mypage')} className={iconBtnCls} aria-label="찜 목록">
            <Heart size={20} />
          </button>
          <button
            onClick={() => navigate('/chat')}
            className={`relative ${iconBtnCls}`}
            aria-label="채팅"
          >
            <MessageCircle size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-accent)] border-2 border-[var(--color-surface)]" />
          </button>
          <button className={iconBtnCls} aria-label="알림">
            <Bell size={20} />
          </button>

          {/* 프로필 or 로그인 */}
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/mypage')}
              className="w-8 h-8 rounded-full ml-1 shrink-0 border-2 border-[var(--color-border)]"
              aria-label="마이페이지"
              style={{ background: 'linear-gradient(135deg, #FF2E4D, #002147)' }}
            />
          ) : (
            <Link
              to="/login"
              className="ml-1 text-sm font-semibold no-underline text-[var(--color-text-main)] hover:text-[var(--color-accent)] transition-colors"
            >
              로그인
            </Link>
          )}

          {/* 판매하기 */}
          <Link
            to="/listing/new"
            className="ml-2 px-3 py-[7px] rounded-md text-xs font-semibold no-underline shrink-0 text-white hover:text-white bg-[var(--color-accent)] border border-[var(--color-accent)] transition-colors"
          >
            판매하기
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
