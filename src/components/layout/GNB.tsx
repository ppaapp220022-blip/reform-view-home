/**
 * GNB (Global Navigation Bar)
 *
 * 반응형 구조:
 *   모바일 (~md): 높이 56px, 로고 + 우측 아이콘(검색/알림/테마토글)만
 *   데스크톱 (md~): 풀 레이아웃 (로고/nav/검색창/아이콘/로그인/판매하기/테마토글)
 *
 * 알림 드롭다운:
 *   - Bell 버튼 클릭 시 열기 / 외부 클릭 시 닫기
 *   - 백엔드 NotificationType: TRADE / CHAT / PRICE_DROP / REVIEW / SYSTEM
 *   - 읽지 않은 알림 수 배지 표시
 */
import { useRef, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Bell, Heart, MessageCircle,
  ShoppingBag, MessageSquare, Tag, Star, Info, X,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import Logo from '../ui/Logo'
import ThemeToggle from '../ui/ThemeToggle'

// ── 알림 타입 (백엔드 NotificationType enum 일치) ─────────────────────────────
type NotificationType = 'TRADE' | 'CHAT' | 'PRICE_DROP' | 'REVIEW' | 'SYSTEM'

interface NotificationItem {
  id: number
  type: NotificationType
  message: string
  subMessage?: string   // 상품명, 닉네임 등 부가 정보
  isRead: boolean
  createdAt: string     // "3분 전", "1시간 전" 등 표시용
  link?: string         // 클릭 시 이동 경로
}

// 목 알림 데이터 (추후 useQuery + /api/notifications로 교체)
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1, type: 'TRADE', isRead: false,
    message: '거래가 수락되었습니다.',
    subMessage: '맨유 23/24 홈 어센틱',
    createdAt: '3분 전', link: '/chat',
  },
  {
    id: 2, type: 'CHAT', isRead: false,
    message: 'uniform_king님이 메시지를 보냈습니다.',
    subMessage: '안녕하세요! 아직 판매 중인가요?',
    createdAt: '15분 전', link: '/chat',
  },
  {
    id: 3, type: 'PRICE_DROP', isRead: false,
    message: '관심 상품 가격이 인하됐습니다.',
    subMessage: 'T1 2024 월즈 유니폼 → ₩108,000',
    createdAt: '1시간 전', link: '/listing/2',
  },
  {
    id: 4, type: 'REVIEW', isRead: true,
    message: '거래 후기가 등록되었습니다.',
    subMessage: 'lck_collector님이 후기를 남겼습니다.',
    createdAt: '어제', link: '/mypage',
  },
  {
    id: 5, type: 'SYSTEM', isRead: true,
    message: 'RE:FORM 이용약관이 변경됩니다.',
    subMessage: '2026년 6월 1일부터 적용',
    createdAt: '3일 전',
  },
]

// 알림 타입별 아이콘 + 색상
const NOTI_META: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  TRADE:      { icon: <ShoppingBag size={14} />,    color: 'var(--color-primary)', bg: 'rgba(0,33,71,.1)' },
  CHAT:       { icon: <MessageSquare size={14} />,  color: 'var(--color-info)',    bg: 'rgba(14,165,233,.1)' },
  PRICE_DROP: { icon: <Tag size={14} />,            color: 'var(--color-success)', bg: 'rgba(0,179,110,.1)' },
  REVIEW:     { icon: <Star size={14} />,           color: 'var(--color-gold)',    bg: 'rgba(255,184,0,.1)' },
  SYSTEM:     { icon: <Info size={14} />,           color: 'var(--color-text-sub)', bg: 'var(--color-surface-raised)' },
}

// ── 알림 드롭다운 컴포넌트 ────────────────────────────────────────────────────
function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)

  const unreadCount = notifications.filter(n => !n.isRead).length

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  function handleClick(noti: NotificationItem) {
    setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, isRead: true } : n))
    if (noti.link) navigate(noti.link)
    onClose()
  }

  return (
    <div
      className="absolute right-0 top-full mt-2 w-[340px] rounded-2xl overflow-hidden shadow-card z-50"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <h3
            className="text-sm font-bold"
            style={{ color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif" }}
          >
            알림
          </h3>
          {unreadCount > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: 'var(--color-accent)' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs transition-colors hover:text-[var(--color-accent)]"
              style={{ color: 'var(--color-text-hint)' }}
            >
              모두 읽음
            </button>
          )}
          <button onClick={onClose} style={{ color: 'var(--color-text-hint)' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={28} className="mx-auto mb-2" style={{ color: 'var(--color-border)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>알림이 없습니다.</p>
          </div>
        ) : (
          notifications.map(noti => {
            const meta = NOTI_META[noti.type]
            return (
              <button
                key={noti.id}
                onClick={() => handleClick(noti)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  background: noti.isRead ? 'transparent' : 'rgba(255,46,77,.03)',
                }}
              >
                {/* 타입 아이콘 */}
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm leading-snug mb-0.5"
                    style={{
                      color: 'var(--color-text-main)',
                      fontWeight: noti.isRead ? 400 : 600,
                    }}
                  >
                    {noti.message}
                  </p>
                  {noti.subMessage && (
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-sub)' }}>
                      {noti.subMessage}
                    </p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-hint)' }}>
                    {noti.createdAt}
                  </p>
                </div>

                {/* 안 읽음 dot */}
                {!noti.isRead && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: 'var(--color-accent)' }}
                  />
                )}
              </button>
            )
          })
        )}
      </div>

      {/* 푸터 */}
      <div
        className="px-4 py-2.5 text-center"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <Link
          to="/mypage"
          onClick={onClose}
          className="text-xs font-semibold hover:text-[var(--color-accent)] transition-colors"
          style={{ color: 'var(--color-text-sub)' }}
        >
          모든 알림 보기
        </Link>
      </div>
    </div>
  )
}

// ── 알림 버튼 (드롭다운 포함) ─────────────────────────────────────────────────
function NotificationButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.isRead).length

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg text-[var(--color-text-main)] border border-transparent hover:border-[var(--color-border)] transition-colors"
        aria-label="알림"
      >
        <Bell size={20} />
        {/* 읽지 않은 알림 배지 */}
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: 'var(--color-accent)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  )
}

// ── 네비게이션 아이템 ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'home',      label: '홈',       path: '/' },
  { id: 'market',    label: '마켓',     path: '/search' },
  { id: 'community', label: '커뮤니티', path: '/community' },
] as const

// ── 메인 GNB ─────────────────────────────────────────────────────────────────
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

  const iconBtnCls = 'w-10 h-10 flex items-center justify-center rounded-lg text-[var(--color-text-main)] border border-transparent hover:border-[var(--color-border)] transition-colors'

  return (
    <header className="sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">

      {/* ── 모바일 헤더 ─────────────────────────────────────────────────── */}
      <div className="flex md:hidden items-center h-14 px-4 gap-2">
        <Link to="/" className="inline-flex items-center" aria-label="RE:FORM 홈">
          <Logo variant="main" height={24} />
        </Link>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => navigate('/search')} className={iconBtnCls} aria-label="검색">
            <Search size={20} />
          </button>
          <NotificationButton />
          <ThemeToggle />
        </div>
      </div>

      {/* ── 데스크톱 헤더 ────────────────────────────────────────────────── */}
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
                  'relative px-[14px] py-2 rounded-lg text-sm font-display no-underline transition-colors',
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

        {/* 우측 아이콘 */}
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
            {/* 채팅 읽지 않음 dot */}
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-accent)] border-2 border-[var(--color-surface)]" />
          </button>

          {/* 알림 버튼 (드롭다운 포함) */}
          <NotificationButton />

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
              className="ml-1 text-sm font-display font-semibold no-underline text-[var(--color-text-main)] hover:text-[var(--color-accent)] transition-colors"
            >
              로그인
            </Link>
          )}

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
