/**
 * App.tsx — 앱 진입점
 *
 * - QueryClientProvider: TanStack Query 전역 설정
 * - RouterProvider: React Router v7 라우트 연결
 * - 마운트 시:
 *   1. useAuthStore.restore() — localStorage JWT 토큰 복원
 *   2. useTheme() — localStorage/OS 기반 다크모드 초기화 및 <html> 클래스 적용
 */
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import queryClient from './lib/queryClient'
import useAuthStore from './store/authStore'
import useTheme from './hooks/useTheme'
import router from './router'

function App() {
  const restore = useAuthStore((s) => s.restore)
  // 다크모드 초기화 — <html> 클래스 적용 및 OS/저장값 반영
  useTheme()

  useEffect(() => {
    restore()
  }, [restore])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
