/**
 * BottomTabBar — 모바일 전용 하단 탭 내비게이션
 *
 * 표시 조건: md 미만 (md 이상에서 hidden)
 * 높이: 64px (디자인 시스템 고정값)
 *
 * 탭 구성:
 *   홈  → /
 *   관심 → /likes     (찜 목록)
 *   등록 → /listing/new  (중앙 accent 강조 버튼)
 *   채팅 → /chat
 *   MY  → /mypage
 *
 * 활성 탭 컬러: --color-accent (red)
 *   - --color-primary(navy)는 다크모드에서 배경에 묻힘 → accent로 통일
 *   - GNB 활성 언더라인과 동일한 컬러 → 시각적 일관성 확보
 *   - 라이트/다크 양쪽에서 항상 선명하게 표시됨
 * pill 배경: --color-accent-subtle (red 8~15% 투명)
 *
 * 등록 탭: red 라운드 사각형 (active 개념 없음, 항상 동일)
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Heart, Plus, MessageCircle, User } from 'lucide-react'

type TabId = 'home' | 'likes' | 'sell' | 'chat' | 'my'

interface TabItem {
  id: TabId
  label: string
  path: string
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  primary?: boolean
}

const TAB_ITEMS: TabItem[] = [
  { id: 'home',  label: '홈',   path: '/',            Icon: Home },
  { id: 'likes', label: '관심', path: '/likes',       Icon: Heart },
  { id: 'sell',  label: '등록', path: '/listing/new', Icon: Plus, primary: true },
  { id: 'chat',  label: '채팅', path: '/chat',        Icon: MessageCircle },
  { id: 'my',    label: 'MY',   path: '/mypage',      Icon: User },
]

/** 현재 경로 기준 활성 탭 id 반환 */
function getActiveTab(pathname: string): TabId | null {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/likes')) return 'likes'
  if (pathname.startsWith('/listing/new')) return 'sell'
  if (pathname.startsWith('/chat')) return 'chat'
  if (pathname.startsWith('/mypage')) return 'my'
  return null
}

export default function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = getActiveTab(location.pathname)

  return (
    <nav
      className="md:hidden sticky bottom-0 z-20 h-16 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-end px-0 pb-2 pt-1.5"
      aria-label="하단 탭 내비게이션"
    >
      {TAB_ITEMS.map(({ id, label, path, Icon, primary }) => {
        const isActive = activeTab === id

        return (
          <button
            key={id}
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center gap-0.5 border-none bg-transparent cursor-pointer"
            style={{
              fontFamily: 'inherit', /* button 기본: Giants (굵고 잘 보여야 하는 탭 레이블) */
              fontSize: 10,
              /* 활성: accent(red) — 라이트/다크 모두에서 선명히 보임 */
              /* 비활성: text-sub — 충분히 눈에 띄되 활성과 대비 유지 */
              color: isActive
                ? 'var(--color-accent)'
                : 'var(--color-text-sub)',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.01em',
            }}
          >
            {primary ? (
              /* 등록 — accent 강조 버튼 */
              <span className="w-9 h-9 rounded-[10px] bg-[var(--color-accent)] text-white flex items-center justify-center">
                <Icon size={20} strokeWidth={2.5} />
              </span>
            ) : (
              /* 일반 탭 — 활성 시 accent-subtle pill 배경 */
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  background: isActive
                    ? 'var(--color-accent-subtle)'
                    : 'transparent',
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              </span>
            )}
            {label}
          </button>
        )
      })}
    </nav>
  )
}