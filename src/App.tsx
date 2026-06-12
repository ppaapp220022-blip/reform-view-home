/**
 * App.tsx — 앱 진입점
 *
 * - QueryClientProvider: TanStack Query 전역 설정
 * - RouterProvider: React Router v7 라우트 연결
 * - 마운트 시:
 *   1. useTheme() — localStorage/OS 기반 다크모드 초기화 및 <html> 클래스 적용
 *
 * ★ authStore는 create() 시점에 localStorage를 동기 복원하므로
 *   별도 restore() useEffect 불필요. 첫 렌더부터 isAuthenticated가 정확히 세팅됨.
 */
import {RouterProvider} from 'react-router-dom'
import {QueryClientProvider} from '@tanstack/react-query'
import queryClient from './lib/queryClient'
import useTheme from './hooks/useTheme'
import router from './router'

function App() {
  // 다크모드 초기화 — <html> 클래스 적용 및 OS/저장값 반영
  useTheme()
  
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router}/>
    </QueryClientProvider>
  )
}

export default App
