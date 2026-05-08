/**
 * AuthLayout — 인증 전용 레이아웃 (GNB·Footer·로고 없음)
 *
 * 로그인, 회원가입, 온보딩 페이지에서 사용.
 * 로고는 각 페이지의 브랜드 패널 안에서 직접 표현.
 */
import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* 콘텐츠 영역 — 수직 중앙 */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Outlet />
      </main>
    </div>
  )
}
