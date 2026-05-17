/**
 * AdminDisputesPage — 관리자 분쟁 목록 (/admin/disputes)
 *
 * 백엔드 분쟁 목록 API 미구현 상태.
 * 현재는 안내 플레이스홀더만 렌더링.
 * 백엔드 GET /api/admin/disputes 구현 후 adminApi에 함수 추가하고 이 페이지 교체.
 *
 * 상세 페이지(/admin/disputes/:id)는 getTrade() 기반으로 구현되어 있음.
 */
import {MessageSquareWarning} from 'lucide-react'

export default function AdminDisputesPage() {
  return (
    <div className="p-6 md:p-8" style={{color: 'var(--color-text-main)'}}>
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background: 'rgba(255,149,0,.12)', color: 'var(--color-warning)'}}
        >
          <MessageSquareWarning size={18}/>
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            분쟁 처리
          </h1>
          <p className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>
            DISPUTED 상태 거래 관리
          </p>
        </div>
      </div>
      
      {/* 미구현 안내 */}
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <MessageSquareWarning size={40} style={{color: 'var(--color-border)'}} className="mb-4"/>
        <p
          className="text-base font-bold mb-2"
          style={{color: 'var(--color-text-sub)', fontFamily: "'Giants','Pretendard',sans-serif"}}
        >
          분쟁 목록 API 준비 중
        </p>
        <p className="text-sm text-center" style={{color: 'var(--color-text-hint)'}}>
          백엔드 <code className="text-xs px-1.5 py-0.5 rounded" style={{background: 'var(--color-surface-raised)'}}>
          GET /api/admin/disputes
        </code> 구현 후 연동 예정입니다.
        </p>
        <p className="text-xs mt-3" style={{color: 'var(--color-text-hint)'}}>
          개별 분쟁 처리는 거래 상세 URL <code className="text-xs">/admin/disputes/:tradeId</code> 로 직접 접근 가능합니다.
        </p>
      </div>
    </div>
  )
}
