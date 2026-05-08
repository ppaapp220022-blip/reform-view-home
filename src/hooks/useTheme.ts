/**
 * useTheme — 다크/라이트 모드 토글 훅
 *
 * 동작:
 *   1. 초기값: localStorage 'theme' → 없으면 OS prefers-color-scheme
 *   2. <html> 에 .dark 클래스 추가/제거 (Tailwind darkMode: 'class')
 *   3. 변경값 localStorage에 저장
 *
 * Logo.tsx의 useDarkMode는 MutationObserver로 클래스 변화를 감지하므로
 * 이 훅으로 토글하면 로고도 자동 전환됨.
 */
import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  // 1. localStorage 저장값 우선
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  // 2. OS 설정 따라감
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  localStorage.setItem('theme', theme)
}

export default function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // 초기 마운트 시 적용
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme, isDark: theme === 'dark' }
}
