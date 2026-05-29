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
import {useEffect, useRef, useState} from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {getNotifications, readAllNotifications, readNotification} from '../../features/notification/api/notificationApi'
import {getMyProfile} from '../../features/mypage/api/memberApi'
import {Link, useLocation, useNavigate} from 'react-router-dom'
import {
  Bell,
  Info,
  Loader2,
  LogOut,
  MessageSquare,
  Search,
  ShoppingBag,
  Star,
  Tag,
  TrendingUp,
  User,
  X,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import type {PostCard} from '../../features/listing/api/listingApi'
import {getPopularListings, getSearchSuggestions} from '../../features/listing/api/listingApi'
import {formatPrice} from '../../utils/format'
import {resolveImageUrl} from '../../utils/image'
import {useStompNotification} from '../../features/notification/hooks/useStompNotification'
import {logout as logoutApi} from '../../features/auth/api/authApi'
import Logo from '../ui/Logo'
import ThemeToggle from '../ui/ThemeToggle'

// ── 알림 타입 (백엔드 NotificationType enum 일치) ─────────────────────────────
type NotificationType = 'TRADE' | 'CHAT' | 'PRICE_DROP' | 'REVIEW' | 'SYSTEM'

interface NotificationItem {
  notiId: number
  type: NotificationType
  content: string          // 알림 메시지 (백엔드 content 필드)
  subMessage?: string      // 부가 메시지 (선택)
  linkUrl: string | null   // 클릭 시 이동 경로 (null = 이동 없음)
  isRead: boolean
  createdAt: string        // ISO 8601
}

// 알림 데이터는 useQuery로 조회 (MOCK 제거됨)

/**
 * 알림 linkUrl을 현재 프론트 라우터에 맞는 내부 경로로 정규화한다.
 *
 * 방어하려는 케이스:
 * - 예전 데이터가 `trade/12`처럼 슬래시 없이 저장된 경우
 * - 절대 URL 전체가 저장된 경우
 * - 리뷰 관련 링크가 `/review/:id`, `/reviews/:id`로 저장된 경우
 *
 * 반환값이 null이면 안전한 내부 라우트로 해석할 수 없는 값이므로 이동하지 않는다.
 */
function resolveNotificationPath(linkUrl: string | null): string | null {
  if (!linkUrl) return null
  const raw = linkUrl.trim()
  if (!raw) return null
  
  try {
    const parsed = raw.startsWith('http://') || raw.startsWith('https://')
      ? new URL(raw)
      : new URL(raw, window.location.origin)
    
    let normalizedPath = parsed.pathname
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `/${normalizedPath}`
    }
    
    // 리뷰 링크는 현재 라우터 기준 /trade/:id/review 로 통일한다.
    const reviewMatch = normalizedPath.match(/^\/reviews?\/(\d+)$/)
    if (reviewMatch) {
      return `/trade/${reviewMatch[1]}/review`
    }
    
    // 쿼리 문자열이 있으면 그대로 유지해 채팅방 직접 진입을 살린다.
    return `${normalizedPath}${parsed.search}${parsed.hash}`
  } catch (error) {
    console.warn('[Notification] 잘못된 linkUrl 형식:', linkUrl, error)
    return raw.startsWith('/') ? raw : `/${raw}`
  }
}

// 알림 타입별 아이콘 + 색상
const NOTI_META: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  TRADE: {icon: <ShoppingBag size={14}/>, color: 'var(--color-primary)', bg: 'rgba(0,33,71,.1)'},
  CHAT: {icon: <MessageSquare size={14}/>, color: 'var(--color-info)', bg: 'rgba(14,165,233,.1)'},
  PRICE_DROP: {icon: <Tag size={14}/>, color: 'var(--color-success)', bg: 'rgba(0,179,110,.1)'},
  REVIEW: {icon: <Star size={14}/>, color: 'var(--color-gold)', bg: 'rgba(255,184,0,.1)'},
  SYSTEM: {icon: <Info size={14}/>, color: 'var(--color-text-sub)', bg: 'var(--color-surface-raised)'},
}


// ── 유저 메뉴 드롭다운 (아바타 클릭 시) ──────────────────────────────────────

/**
 * UserMenuDropdown — 로그인 상태에서 아바타 클릭 시 표시
 * - 닉네임 + 이메일 표시
 * - 마이페이지 이동
 * - 로그아웃 (백엔드 토큰 무효화 + authStore 초기화 + /login 이동)
 */
function UserMenuDropdown({onClose}: { onClose: () => void }) {
  const navigate = useNavigate()
  const {user, logout, refreshToken} = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      // 백엔드 토큰 무효화 (실패해도 로컬 로그아웃 강행)
      if (refreshToken) {
        await logoutApi(refreshToken).catch(() => null)
      }
    } finally {
      logout()            // localStorage 초기화 + Zustand 리셋
      onClose()
      navigate('/login')
      setIsLoggingOut(false)
    }
  }
  
  return (
    <div
      className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden shadow-card z-50 bg-surface border border-border"
    >
      {/* 유저 정보 */}
      <div
        className="px-4 py-3.5 border-b border-border"
      >
        <p className="text-sm font-bold truncate text-text-main">{user?.nickname ?? '사용자'}</p>
        <p className="text-xs mt-0.5 truncate text-text-hint">{user?.email ?? ''}</p>
      </div>
      
      {/* 메뉴 항목 */}
      <div className="py-1">
        <button
          onClick={() => {
            navigate('/mypage');
            onClose()
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--color-surface-raised)] text-text-main"
        >
          <User size={15} style={{flexShrink: 0}}/>
          마이페이지
        </button>
        
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--color-surface-raised)] disabled:opacity-60 text-accent"
        >
          <LogOut size={15} style={{flexShrink: 0}}/>
          {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </div>
    </div>
  )
}

// ── 유저 아바타 버튼 (드롭다운 포함) ─────────────────────────────────────────

function UserAvatarButton() {
  const [open, setOpen] = useState(false)
  const [failedUrl, setFailedUrl] = useState<string | null | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)
  const {user} = useAuthStore()
  
  /**
   * authStore의 user.profileImageUrl은 로그인 시점 스냅샷이라 프로필 수정 후 반영 안됨.
   * myProfile 쿼리(MyPage에서 이미 캐시됨)를 구독해서 최신 이미지 URL 사용.
   * enabled: !!user 로 로그인 상태에서만 실행, staleTime 공유해 추가 네트워크 비용 없음.
   */
  const {data: profile} = useQuery({
    queryKey: ['myProfile', user?.id],
    queryFn: getMyProfile,
    staleTime: 60_000,
    enabled: !!user,
  })
  // 서버 프로필 우선, 없으면 authStore 폴백
  const avatarUrl = profile?.profileImageUrl ?? user?.profileImageUrl
  const nickname = profile?.nickname ?? user?.nickname
  // avatarUrl이 달라지면 자동으로 false — Effect 없이 렌더 중에 파생 계산
  const imgError = failedUrl === avatarUrl
  
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
  
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-8 h-8 rounded-full ml-1 shrink-0 border-2 flex items-center justify-center text-white text-xs font-bold overflow-hidden transition-all hover:opacity-80"
        style={{
          background: avatarUrl && !imgError ? 'transparent' : 'linear-gradient(135deg, #FF2E4D, #002147)',
          borderColor: open ? 'var(--color-accent)' : 'var(--color-border)',
          fontFamily: "'IAMAPLAYER',Giants,sans-serif",
        }}
        aria-label="내 메뉴"
      >
        {avatarUrl && !imgError ? (
          /* 이미지 로드 실패 시 이니셜로 폴백 */
          <img
            src={avatarUrl}
            alt={nickname ?? ''}
            className="w-full h-full object-cover"
            onError={() => setFailedUrl(avatarUrl)}
          />
        ) : (
          user?.nickname?.slice(0, 2).toUpperCase() ?? 'ME'
        )}
      </button>
      {open && <UserMenuDropdown onClose={() => setOpen(false)}/>}
    </div>
  )
}

// ── 알림 드롭다운 컴포넌트 ────────────────────────────────────────────────────
function NotificationDropdown({onClose}: { onClose: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  
  // 알림 목록 조회 (최대 20개)
  const {data: notiData, isLoading} = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({page: 0, size: 20}),
    staleTime: 30_000,
    refetchInterval: 60_000, // 60초마다 자동 갱신
  })
  
  const notifications: NotificationItem[] = notiData?.content?.content ?? []
  const unreadCount = notiData?.unreadCount ?? 0
  
  // 전체 읽음 처리
  const markAllMutation = useMutation({
    mutationFn: readAllNotifications,
    onSuccess: () => void qc.invalidateQueries({queryKey: ['notifications']}),
  })
  
  // 개별 읽음 처리
  const markOneMutation = useMutation({
    mutationFn: (notiId: number) => readNotification(notiId),
    onSuccess: () => void qc.invalidateQueries({queryKey: ['notifications']}),
  })
  
  function markAllRead() {
    markAllMutation.mutate()
  }
  
  function handleClick(noti: NotificationItem) {
    if (!noti.isRead) markOneMutation.mutate(noti.notiId)
    const destination = resolveNotificationPath(noti.linkUrl)
    if (destination) {
      navigate(destination)
    } else {
      console.warn('[Notification] 이동 가능한 linkUrl이 없습니다:', noti)
    }
    onClose()
  }
  
  return (
    <div
      className="absolute right-0 top-full mt-2 w-[340px] rounded-2xl overflow-hidden shadow-card z-50 bg-surface"
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <h3
            className="text-sm font-bold text-text-main" style={{fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            알림
          </h3>
          {unreadCount > 0 && (
            <span
              className="text-[12px] font-bold px-1.5 py-0.5 rounded-full text-white bg-accent"
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs transition-colors hover:text-[var(--color-accent)] text-text-hint"
            >
              모두 읽음
            </button>
          )}
          <button onClick={onClose} className="text-text-hint">
            <X size={15}/>
          </button>
        </div>
      </div>
      
      {/* 알림 목록 */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                 style={{borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)'}}/>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={28} className="mx-auto mb-2 border-border"/>
            <p className="text-sm text-text-hint">알림이 없습니다.</p>
          </div>
        ) : (
          notifications.map(noti => {
            const meta = NOTI_META[noti.type]
            return (
              <button
                key={noti.notiId}
                onClick={() => handleClick(noti)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
                style={{
                  background: noti.isRead ? 'transparent' : 'rgba(255,46,77,.03)',
                }}
              >
                {/* 타입 아이콘 */}
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{background: meta.bg, color: meta.color}}
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
                    {noti.content}
                  </p>
                  {noti.subMessage && (
                    <p className="text-xs truncate text-text-sub">
                      {noti.subMessage}
                    </p>
                  )}
                  <p className="text-[12px] mt-1 text-text-hint">
                    {noti.createdAt.slice(0, 16).replace('T', ' ')}
                  </p>
                </div>
                
                {/* 안 읽음 dot */}
                {!noti.isRead && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-accent"
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
      >
        <Link
          to="/mypage"
          onClick={onClose}
          className="text-xs font-semibold hover:text-[var(--color-accent)] transition-colors text-text-sub"
        >
          모든 알림 보기
        </Link>
      </div>
    </div>
  )
}

// ── 알림 버튼 (드롭다운 포함) ─────────────────────────────────────────────────
function NotificationButton({className}: { className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const {user} = useAuthStore()  // 로그인 상태 확인용 — enabled: !!user 에서 사용
  
  // 로그인 상태일 때 /sub/notification/{memberId} 구독 — 알림 수신 시 자동 re-fetch
  useStompNotification(user?.id ?? null)
  
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
  
  // 미읽음 알림 수: useQuery로 조회 (Bell 배지용)
  const {data: notiCountData} = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({page: 0, size: 1}),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: !!user,     // 로그인 시에만
  })
  const unreadCount = notiCountData?.unreadCount ?? 0  // NotificationPageResponse.unreadCount
  
  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg text-[var(--color-text-main)] border border-transparent hover:border-[var(--color-border)] transition-colors"
        aria-label="알림"
      >
        <Bell size={20}/>
        {/* 읽지 않은 알림 배지 */}
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-[12px] font-bold text-white flex items-center justify-center bg-accent"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && <NotificationDropdown onClose={() => setOpen(false)}/>}
    </div>
  )
}

// ── GNB 검색바 (데스크톱 전용) ─────────────────────────────────────────────────

/**
 * GnbSearchBar — GNB 내 AI 연동 검색창 (데스크톱 전용)
 *
 * 동작 흐름:
 *   - 포커스 + 빈 입력: 백엔드 배치 인기 매물 목록 표시 (getPopularListings)
 *   - 300ms 디바운스 후 입력: AI 의미 기반 유사 검색 제안 (getSearchSuggestions)
 *   - 아이템 클릭: /listing/{id} 이동
 *   - Enter: /search?q={keyword} 이동
 *   - Escape / 외부 클릭: 드롭다운 닫기
 */
function GnbSearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // 디바운스 타이머 레퍼런스 (setTimeout ID 저장)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // 300ms 디바운스 — 타이핑 완료 후 AI 검색 요청
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(val), 300)
  }
  
  // 외부 클릭 감지 → 드롭다운 닫기
  useEffect(() => {
    if (!focused) return
    
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [focused])
  
  // 인기 매물 — 포커스 시 미리 로드 (빈 쿼리 상태에서 표시)
  const {data: popularItems} = useQuery({
    queryKey: ['gnbPopularListings'],
    queryFn: () => getPopularListings(6),
    staleTime: 60_000,
    enabled: focused,      // 포커스 시에만 요청
  })
  
  // AI 검색 제안 — 타이핑 후 디바운스 쿼리로 요청
  const {data: suggestions, isFetching: isSuggesting} = useQuery({
    queryKey: ['gnbSuggestions', debouncedQuery],
    queryFn: () => getSearchSuggestions(debouncedQuery, 5),
    staleTime: 30_000,
    // 포커스 상태이고 디바운스 쿼리가 있을 때만 요청
    enabled: focused && debouncedQuery.trim().length > 0,
  })
  
  // 표시할 아이템: 쿼리 있으면 AI 제안, 없으면 인기 매물
  const showSuggestions = debouncedQuery.trim().length > 0
  const items: PostCard[] = showSuggestions ? (suggestions ?? []) : (popularItems ?? [])
  
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`)
      setFocused(false)
      inputRef.current?.blur()
    }
  }
  
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setFocused(false)
      inputRef.current?.blur()
    }
  }
  
  function handleItemClick(item: PostCard) {
    navigate(`/listing/${item.postId}`)
    setFocused(false)
    setQuery('')
    setDebouncedQuery('')
  }
  
  return (
    <div ref={containerRef} className="relative flex-1" style={{maxWidth: 360}}>
      {/* 검색 입력창 */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
        style={{
          background: 'var(--color-surface-raised)',
          border: `1px solid ${focused ? 'var(--color-primary)' : 'var(--color-border)'}`,
        }}
      >
        <Search size={14} style={{color: 'var(--color-text-hint)', flexShrink: 0}}/>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="팀, 선수, 유니폼 검색..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{color: 'var(--color-text-main)', minWidth: 0}}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setDebouncedQuery('')
              inputRef.current?.focus()
            }}
            aria-label="검색어 지우기"
            style={{color: 'var(--color-text-hint)', flexShrink: 0}}
          >
            <X size={13}/>
          </button>
        )}
      </form>
      
      {/* 드롭다운 — 포커스 상태에서만 표시 */}
      {focused && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-30"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 32px -4px rgba(0,33,71,.18)',
          }}
        >
          {/* 드롭다운 헤더 — 섹션 레이블 + 전체 보기 */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{borderColor: 'var(--color-border)'}}
          >
            {showSuggestions ? (
              <div className="flex items-center gap-1.5">
                <Search size={12} style={{color: 'var(--color-text-hint)'}}/>
                <span className="text-xs font-semibold" style={{color: 'var(--color-text-hint)'}}>
                  AI 검색 결과
                </span>
                {/* AI 검색 중 스피너 */}
                {isSuggesting && (
                  <Loader2 size={11} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} style={{color: 'var(--color-accent)'}}/>
                <span className="text-xs font-semibold" style={{color: 'var(--color-text-hint)'}}>
                  인기 매물
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                navigate(
                  showSuggestions
                    ? `/search?q=${encodeURIComponent(query.trim())}`
                    : '/search',
                )
                setFocused(false)
              }}
              className="text-xs font-semibold hover:underline"
              style={{color: 'var(--color-accent)'}}
            >
              전체 보기
            </button>
          </div>
          
          {/* 결과 없음 안내 */}
          {items.length === 0 && !isSuggesting && (
            <p className="text-xs text-center py-5" style={{color: 'var(--color-text-hint)'}}>
              {showSuggestions ? '검색 결과가 없습니다' : '데이터를 불러오는 중...'}
            </p>
          )}
          
          {/* 아이템 리스트 */}
          {items.map(item => {
            const imgSrc = resolveImageUrl(item.thumbnailUrl)
            return (
              <button
                key={item.postId}
                type="button"
                onClick={() => handleItemClick(item)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                {/* 썸네일 */}
                <div
                  className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
                  style={{background: '#1A3051'}}
                >
                  {imgSrc && (
                    <img
                      src={imgSrc}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold truncate"
                    style={{color: 'var(--color-text-main)'}}
                  >
                    {item.title}
                  </p>
                  <p className="text-[11px]" style={{color: 'var(--color-text-hint)'}}>
                    {item.team}
                  </p>
                </div>
                {/* 가격 */}
                <p
                  className="text-xs font-bold flex-shrink-0"
                  style={{
                    color: 'var(--color-primary)',
                    fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                  }}
                >
                  {formatPrice(item.price)}
                </p>
              </button>
            )
          })}
          
          {/* 타이핑 중일 때 "전체 결과 보기" 버튼 */}
          {showSuggestions && query.trim() && (
            <button
              type="button"
              onClick={() => {
                navigate(`/search?q=${encodeURIComponent(query.trim())}`)
                setFocused(false)
              }}
              className="flex items-center justify-center gap-2 w-full py-3 border-t text-xs font-semibold hover:bg-[var(--color-surface-raised)] transition-colors"
              style={{borderColor: 'var(--color-border)', color: 'var(--color-accent)'}}
            >
              <Search size={13}/>
              &quot;{query}&quot; 검색 결과 전체 보기
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── 네비게이션 아이템 ─────────────────────────────────────────────────────────
// 홈(/) — 브랜드 소개 + 피처 리스팅 허브
// 마켓(/search) — 전체 검색·필터 마켓플레이스
const NAV_ITEMS = [
  {id: 'home', label: '홈', path: '/'},
  {id: 'market', label: '마켓', path: '/search'},
  {id: 'community', label: '커뮤니티', path: '/community'},
  {id: 'chat', label: '채팅', path: '/chat'},
  {id: 'mypage', label: '마이페이지', path: '/mypage'},
] as const

// ── 메인 GNB ─────────────────────────────────────────────────────────────────
export default function GNB() {
  const location = useLocation()
  const navigate = useNavigate()
  const {isAuthenticated} = useAuthStore()
  
  const getActiveId = () => {
    // '/' → 홈, '/search' → 마켓
    if (location.pathname === '/') return 'home'
    if (location.pathname.startsWith('/search')) return 'market'
    if (location.pathname.startsWith('/community')) return 'community'
    if (location.pathname.startsWith('/chat')) return 'chat'
    if (location.pathname.startsWith('/mypage')) return 'mypage'
    return null
  }
  const activeId = getActiveId()
  
  const iconBtnCls = 'w-10 h-10 flex items-center justify-center rounded-lg text-[var(--color-text-main)] border border-transparent hover:border-[var(--color-border)] transition-colors'
  
  return (
    <header className="sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      
      {/* ── 모바일 헤더 ─────────────────────────────────────────────────── */}
      <div className="flex md:hidden items-center h-14 px-4 gap-2">
        <Link to="/" className="inline-flex items-center" aria-label="RE:FORM 홈">
          <Logo variant="main" height={24}/>
        </Link>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => navigate('/search')} className={iconBtnCls} aria-label="검색">
            <Search size={20}/>
          </button>
          <NotificationButton/>
          {/* 모바일 로그인/아바타 — 로그아웃 접근 경로 */}
          {isAuthenticated ? (
            <UserAvatarButton/>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold no-underline px-2.5 py-1.5 rounded-md transition-colors hover:text-white"
              style={{background: 'var(--color-accent)', color: '#fff'}}
            >
              로그인
            </Link>
          )}
        </div>
      </div>
      
      {/* ── 데스크톱 헤더 ────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center max-w-[1280px] mx-auto px-7 py-[14px] gap-7">
        
        {/* 로고 */}
        <Link to="/" className="inline-flex items-center shrink-0" aria-label="RE:FORM 홈">
          <Logo variant="main" height={28}/>
        </Link>
        
        {/* 메인 네비게이션 */}
        <nav className="flex gap-1">
          {NAV_ITEMS.map(({id, label, path}) => {
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
                  <span
                    className="absolute left-[14px] right-[14px] -bottom-[15px] h-0.5 bg-[var(--color-accent)] rounded-sm"/>
                )}
              </Link>
            )
          })}
        </nav>
        
        {/* GNB 검색바 — AI 의미 기반 자동완성 드롭다운 */}
        <GnbSearchBar/>
        
        {/* 우측 액션 영역 — 채팅·마이페이지는 nav로 이동, 알림만 아이콘 유지 */}
        <div className="flex items-center gap-2 ml-auto">
          {/* 알림 버튼 (드롭다운 포함) */}
          <NotificationButton/>
          
          {/* 프로필 or 로그인 */}
          {isAuthenticated ? (
            <UserAvatarButton/>
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
          
          <ThemeToggle/>
        </div>
      </div>
    </header>
  )
}
