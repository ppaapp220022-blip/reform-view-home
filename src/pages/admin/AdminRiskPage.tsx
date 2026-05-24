/**
 * AdminRiskPage — 관리자 AI 위험 탐지 목록 (/admin/risk)
 *
 * 기능:
 *   - 게시글 / 채팅 탭 전환
 *   - riskLevel(LOW | MID | HIGH) 필터
 *   - 페이지네이션
 *   - 게시글 탭: 해당 판매글로 바로가기 링크
 */
import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useQuery} from '@tanstack/react-query'
import {AlertTriangle, ChevronLeft, ChevronRight, Loader2, MessageCircle, ShieldAlert} from 'lucide-react'
import type {RiskLevel} from '../../features/admin/api/adminApi'
import {getAdminChatRisks, getAdminPostRisks} from '../../features/admin/api/adminApi'

// ── 상수 ─────────────────────────────────────────────────────────────────────

const LEVEL_META: Record<RiskLevel, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  LOW: {
    label: '낮음',
    color: 'var(--color-success)',
    bg: 'rgba(0,179,110,.1)',
    icon: <ShieldAlert size={12}/>,
  },
  MID: {
    label: '주의',
    color: 'var(--color-warning)',
    bg: 'rgba(255,149,0,.1)',
    icon: <AlertTriangle size={12}/>,
  },
  HIGH: {
    label: '위험',
    color: 'var(--color-accent)',
    bg: 'rgba(255,46,77,.1)',
    icon: <AlertTriangle size={12}/>,
  },
}

const LEVEL_FILTERS: { value: string; label: string }[] = [
  {value: '', label: '전체'},
  {value: 'HIGH', label: '위험'},
  {value: 'MID', label: '주의'},
  {value: 'LOW', label: '낮음'},
]

const TARGET_LABELS: Record<string, string> = {
  POST: '판매글',
  CHAT: '채팅',
  REPLY: '댓글',
  COMMENT: '커뮤니티',
}

const PAGE_SIZE = 20

// ── 날짜 포맷 ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── 위험도 뱃지 ───────────────────────────────────────────────────────────────

function RiskBadge({level}: { level: RiskLevel | null }) {
  if (!level) return <span style={{color: 'var(--color-text-hint)'}}>-</span>
  const meta = LEVEL_META[level]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{background: meta.bg, color: meta.color}}
    >
      {meta.icon}{meta.label}
    </span>
  )
}

// ── 게시글 위험 탐지 탭 ───────────────────────────────────────────────────────

function PostRiskTab() {
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('')
  const [page, setPage] = useState(1)
  
  const {data, isLoading} = useQuery({
    queryKey: ['admin-risk-posts', riskLevel, page],
    queryFn: () => getAdminPostRisks({
      riskLevel: riskLevel || undefined,
      page,
      size: PAGE_SIZE,
    }),
    staleTime: 30_000,
  })
  
  const totalPages = data ? Math.ceil(data.totalElements / PAGE_SIZE) : 1
  
  return (
    <div className="flex flex-col gap-4">
      {/* 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold" style={{color: 'var(--color-text-sub)'}}>위험도</span>
        {LEVEL_FILTERS.map(opt => (
          <button
            key={opt.value}
            onClick={() => {
              setRiskLevel(opt.value as RiskLevel | '');
              setPage(1)
            }}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
            style={riskLevel === opt.value
              ? {background: 'var(--color-primary)', color: '#fff'}
              : {
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-sub)',
                border: '1px solid var(--color-border)'
              }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      
      {/* 테이블 */}
      <div
        className="rounded-xl overflow-hidden"
        style={{border: '1px solid var(--color-border)'}}
      >
        {/* 헤더 */}
        <div
          className="grid text-xs font-bold px-4 py-2.5"
          style={{
            gridTemplateColumns: '60px 1fr 80px 120px 80px',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-text-hint)',
          }}
        >
          <span>ID</span>
          <span>사유 / 제안</span>
          <span>대상</span>
          <span>감지 시각</span>
          <span>위험도</span>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
          </div>
        ) : !data?.content.length ? (
          <div className="flex flex-col items-center py-12 gap-2" style={{color: 'var(--color-text-hint)'}}>
            <ShieldAlert size={28}/>
            <p className="text-sm">탐지된 위험 게시글이 없습니다.</p>
          </div>
        ) : (
          data.content.map((item, i) => (
            <div
              key={item.riskId}
              className="grid items-start px-4 py-3 gap-x-3 text-sm transition-colors"
              style={{
                gridTemplateColumns: '60px 1fr 80px 120px 80px',
                borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              {/* ID + 링크 */}
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs" style={{color: 'var(--color-text-hint)'}}>
                  #{item.riskId}
                </span>
                {item.targetType === 'POST' && (
                  <Link
                    to={`/listing/${item.targetId}`}
                    className="text-xs underline"
                    style={{color: 'var(--color-accent)'}}
                    target="_blank"
                    rel="noreferrer"
                  >
                    글 보기
                  </Link>
                )}
              </div>
              
              {/* 사유 + 제안 */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <p
                  className="text-xs leading-relaxed truncate"
                  style={{color: 'var(--color-text-main)'}}
                  title={item.reason ?? '-'}
                >
                  {item.reason ?? '-'}
                </p>
                {item.suggestion && (
                  <p
                    className="text-xs leading-relaxed truncate"
                    style={{color: 'var(--color-text-hint)'}}
                    title={item.suggestion}
                  >
                    → {item.suggestion}
                  </p>
                )}
              </div>
              
              {/* 대상 유형 */}
              <span className="text-xs" style={{color: 'var(--color-text-sub)'}}>
                {TARGET_LABELS[item.targetType] ?? item.targetType}
              </span>
              
              {/* 감지 시각 */}
              <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>
                {formatDateTime(item.createdAt)}
              </span>
              
              {/* 위험도 뱃지 */}
              <RiskBadge level={item.riskLevel}/>
            </div>
          ))
        )}
      </div>
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{background: 'var(--color-surface-raised)'}}
          >
            <ChevronLeft size={14}/>
          </button>
          <span className="text-sm" style={{color: 'var(--color-text-sub)'}}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{background: 'var(--color-surface-raised)'}}
          >
            <ChevronRight size={14}/>
          </button>
        </div>
      )}
    </div>
  )
}

// ── 채팅 위험 탐지 탭 ─────────────────────────────────────────────────────────

function ChatRiskTab() {
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('')
  const [page, setPage] = useState(1)
  
  const {data, isLoading} = useQuery({
    queryKey: ['admin-risk-chats', riskLevel, page],
    queryFn: () => getAdminChatRisks({
      riskLevel: riskLevel || undefined,
      page,
      size: PAGE_SIZE,
    }),
    staleTime: 30_000,
  })
  
  const totalPages = data ? Math.ceil(data.totalElements / PAGE_SIZE) : 1
  
  return (
    <div className="flex flex-col gap-4">
      {/* 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold" style={{color: 'var(--color-text-sub)'}}>위험도</span>
        {LEVEL_FILTERS.map(opt => (
          <button
            key={opt.value}
            onClick={() => {
              setRiskLevel(opt.value as RiskLevel | '');
              setPage(1)
            }}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
            style={riskLevel === opt.value
              ? {background: 'var(--color-primary)', color: '#fff'}
              : {
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-sub)',
                border: '1px solid var(--color-border)'
              }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      
      {/* 테이블 */}
      <div
        className="rounded-xl overflow-hidden"
        style={{border: '1px solid var(--color-border)'}}
      >
        {/* 헤더 */}
        <div
          className="grid text-xs font-bold px-4 py-2.5"
          style={{
            gridTemplateColumns: '60px 1fr 120px 80px',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-text-hint)',
          }}
        >
          <span>ID</span>
          <span>사유 / 제안</span>
          <span>감지 시각</span>
          <span>위험도</span>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
          </div>
        ) : !data?.content.length ? (
          <div className="flex flex-col items-center py-12 gap-2" style={{color: 'var(--color-text-hint)'}}>
            <MessageCircle size={28}/>
            <p className="text-sm">탐지된 위험 채팅이 없습니다.</p>
          </div>
        ) : (
          data.content.map((item, i) => (
            <div
              key={item.riskId}
              className="grid items-start px-4 py-3 gap-x-3 text-sm transition-colors"
              style={{
                gridTemplateColumns: '60px 1fr 120px 80px',
                borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              {/* ID */}
              <span className="font-mono text-xs" style={{color: 'var(--color-text-hint)'}}>
                #{item.riskId}
              </span>
              
              {/* 사유 + 제안 */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <p
                  className="text-xs leading-relaxed truncate"
                  style={{color: 'var(--color-text-main)'}}
                  title={item.reason ?? '-'}
                >
                  {item.reason ?? '-'}
                </p>
                {item.suggestion && (
                  <p
                    className="text-xs leading-relaxed truncate"
                    style={{color: 'var(--color-text-hint)'}}
                    title={item.suggestion}
                  >
                    → {item.suggestion}
                  </p>
                )}
              </div>
              
              {/* 감지 시각 */}
              <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>
                {formatDateTime(item.createdAt)}
              </span>
              
              {/* 위험도 뱃지 */}
              <RiskBadge level={item.riskLevel}/>
            </div>
          ))
        )}
      </div>
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{background: 'var(--color-surface-raised)'}}
          >
            <ChevronLeft size={14}/>
          </button>
          <span className="text-sm" style={{color: 'var(--color-text-sub)'}}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{background: 'var(--color-surface-raised)'}}
          >
            <ChevronRight size={14}/>
          </button>
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function AdminRiskPage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'chat'>('posts')
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background: 'rgba(255,46,77,.1)', color: 'var(--color-accent)'}}
        >
          <ShieldAlert size={20}/>
        </div>
        <div>
          <h1
            className="text-lg font-bold"
            style={{fontFamily: "'Giants','Pretendard',sans-serif", color: 'var(--color-text-main)'}}
          >
            AI 위험 탐지
          </h1>
          <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
            AI가 감지한 위험 게시글 및 채팅 메시지 목록
          </p>
        </div>
      </div>
      
      {/* 탭 */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
        style={{background: 'var(--color-surface-raised)'}}
      >
        {([
          {key: 'posts', label: '판매글 위험 탐지'},
          {key: 'chat', label: '채팅 위험 탐지'},
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={activeTab === tab.key
              ? {
                background: 'var(--color-surface)',
                color: 'var(--color-text-main)',
                boxShadow: '0 1px 4px rgba(0,0,0,.08)'
              }
              : {color: 'var(--color-text-hint)', background: 'transparent'}}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* 탭 콘텐츠 */}
      {activeTab === 'posts' ? <PostRiskTab/> : <ChatRiskTab/>}
    </div>
  )
}
