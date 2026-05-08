/**
 * Logo 컴포넌트
 *
 * variant:
 *   "main"   → 공간 충분한 곳 (GNB, 인증 페이지 등)
 *              다크모드 자동 감지 → re-form_logo_main_dark.svg 전환
 *   "simple" → compact 영역 (Footer 등) — 다크/라이트 겸용 단일 파일
 *
 * 다크모드 감지:
 *   1. <html> 클래스에 .dark 추가 (Tailwind class 방식)
 *   2. prefers-color-scheme: dark (OS 설정)
 *   두 방식 모두 지원. Tailwind .dark 클래스가 OS 설정보다 우선.
 *
 * SVG 파일들은 모두 PNG 임베드 래퍼 → CSS fill/stroke 색상 변경 불가
 * 권장 height: main 24–32px, simple 20–28px
 */
import { useState, useEffect } from 'react'

interface LogoProps {
  variant?: 'main' | 'simple'
  height?: number
  className?: string
}

/** SVG viewBox 기준 가로세로 비율 */
const ASPECT_RATIO = {
  main:   1822 / 430,  // ≈ 4.24 (main / main-dark 동일)
  simple: 2240 / 411,  // ≈ 5.45
} as const

/** src/assets에 있는 로고 파일 경로 매핑 */
const LOGO_SRC = {
  mainLight: '/assets/re-form_logo_main.svg',
  mainDark:  '/assets/re-form_logo_main_dark.svg',
  simple:    '/assets/re-form_logo_simple.svg',
} as const

/**
 * 다크모드 감지 훅
 * - <html class="dark"> 변화 감지 (Tailwind class 방식)
 * - prefers-color-scheme 변화 감지 (OS 방식)
 * - Tailwind .dark 클래스가 우선
 */
function useDarkMode(): boolean {
  const getIsDark = () => {
    // .dark 클래스가 있으면 우선 적용
    if (document.documentElement.classList.contains('dark')) return true
    // 없으면 OS 설정 따라감
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  const [isDark, setIsDark] = useState<boolean>(getIsDark)

  useEffect(() => {
    // <html> 클래스 변경 감시 (Tailwind .dark 토글 감지)
    const observer = new MutationObserver(() => {
      setIsDark(getIsDark())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // OS 다크모드 변경 감시
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onMqChange = () => setIsDark(getIsDark())
    mq.addEventListener('change', onMqChange)

    return () => {
      observer.disconnect()
      mq.removeEventListener('change', onMqChange)
    }
  }, [])

  return isDark
}

export default function Logo({
  variant = 'main',
  height = 28,
  className = '',
}: LogoProps) {
  const isDark = useDarkMode()

  // variant별 src 결정
  const src =
    variant === 'simple'
      ? LOGO_SRC.simple                              // 겸용 단일 파일
      : isDark ? LOGO_SRC.mainDark : LOGO_SRC.mainLight  // 다크모드 자동 전환

  const width = Math.round(height * ASPECT_RATIO[variant])

  return (
    <img
      src={src}
      alt="RE:FORM 로고"
      width={width}
      height={height}
      className={className}
      draggable={false}
      style={{ objectFit: 'contain' }}
    />
  )
}
