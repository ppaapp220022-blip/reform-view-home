/**
 * NotFoundPage — 404 페이지
 */
import {Link, useNavigate} from 'react-router-dom'
import {Home, MoveLeft, SearchX} from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{background: 'var(--color-bg)'}}
    >
      <div className="text-center max-w-sm">
        {/* 404 대형 텍스트 */}
        <p
          className="text-[96px] font-bold leading-none mb-4 select-none"
          style={{
            color: 'var(--color-border)',
            fontFamily: "'IAMAPLAYER',Giants,sans-serif",
            letterSpacing: '-0.02em',
          }}
        >
          404
        </p>
        
        {/* 아이콘 */}
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
          style={{background: 'var(--color-surface)'}}
        >
          <SearchX size={30} style={{color: 'var(--color-text-hint)'}}/>
        </div>
        
        {/* 메시지 */}
        <h1
          className="text-xl font-bold mb-2"
          style={{
            color: 'var(--color-text-main)',
            fontFamily: "'Giants','Pretendard',sans-serif",
          }}
        >
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{color: 'var(--color-text-sub)'}}>
          요청하신 주소가 존재하지 않거나 삭제된 페이지입니다.
        </p>
        
        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-sub)',
              fontFamily: "'Giants','Pretendard',sans-serif",
            }}
          >
            <MoveLeft size={15}/>
            이전 페이지
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:text-white transition-all"
            style={{
              background: 'var(--color-primary)',
              fontFamily: "'Giants','Pretendard',sans-serif",
            }}
          >
            <Home size={15}/>
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  )
}
