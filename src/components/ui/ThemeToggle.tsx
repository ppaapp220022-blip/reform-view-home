/**
 * ThemeToggle — 다크/라이트 모드 전환 버튼
 *
 * - 라이트 모드: Moon 아이콘 (클릭 시 다크로 전환)
 * - 다크 모드: Sun 아이콘 (클릭 시 라이트로 전환)
 * - GNB 우측 판매하기 버튼 오른쪽에 배치
 */
import { Sun, Moon } from 'lucide-react'
import useTheme from '../../hooks/useTheme'

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--color-text-main)] border border-transparent hover:border-[var(--color-border)] transition-colors"
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
