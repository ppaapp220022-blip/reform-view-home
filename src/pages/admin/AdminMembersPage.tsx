/**
 * AdminMembersPage — 관리자 회원 목록 (/admin/members)
 *
 * 기능:
 *   - 회원 목록 조회 (키워드·상태 필터 + 페이지네이션)
 *   - 상태 배지: ACTIVE / SUSPENDED / WITHDRAWN
 *   - 회원 상세 페이지 링크 (/admin/members/:id)
 */
import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useQuery} from '@tanstack/react-query'
import {ChevronLeft, ChevronRight, Loader2, Search, Users} from 'lucide-react'
import type {MemberStatus} from '../../features/admin/api/adminApi'
import {getAdminMembers} from '../../features/admin/api/adminApi'

// ── 상수 ─────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: '정상',
  SUSPENDED: '정지',
  WITHDRAWN: '탈퇴',
}

const STATUS_COLORS: Record<MemberStatus, { color: string; bg: string }> = {
  ACTIVE: {color: 'var(--color-success)', bg: 'rgba(0,179,110,.1)'},
  SUSPENDED: {color: 'var(--color-warning)', bg: 'rgba(255,149,0,.1)'},
  WITHDRAWN: {color: 'var(--color-text-hint)', bg: 'rgba(0,0,0,.06)'},
}

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  {value: '', label: '전체 상태'},
  {value: 'ACTIVE', label: '정상'},
  {value: 'SUSPENDED', label: '정지'},
  {value: 'WITHDRAWN', label: '탈퇴'},
]

const PAGE_SIZE = 20

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function AdminMembersPage() {
  const [keyword, setKeyword] = useState('')
  const [inputVal, setInputVal] = useState('')       // 입력창 임시 값 (엔터/버튼 시 적용)
  const [statusFilter, setStatusFilter] = useState<MemberStatus | ''>('')
  const [page, setPage] = useState(0)
  
  const {data, isLoading} = useQuery({
    queryKey: ['admin-members', keyword, statusFilter, page],
    queryFn: () =>
      getAdminMembers({
        keyword: keyword || undefined,
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      }),
    staleTime: 30_000,
  })
  
  const members = data?.content ?? []
  const totalPages = data ? Math.ceil(data.totalElements / PAGE_SIZE) : 0
  
  // 검색 실행 (엔터 또는 버튼)
  function handleSearch() {
    setKeyword(inputVal.trim())
    setPage(0)
  }
  
  // 필터 변경 시 페이지 초기화
  function handleStatusChange(v: string) {
    setStatusFilter(v as MemberStatus | '')
    setPage(0)
  }
  
  return (
    <div className="p-6 md:p-8" style={{color: 'var(--color-text-main)'}}>
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background: 'rgba(0,33,71,.1)', color: 'var(--color-primary)'}}
        >
          <Users size={18}/>
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            회원 관리
          </h1>
          <p className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>
            전체 회원 조회·상태 확인·상세 제재
          </p>
        </div>
      </div>
      
      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* 키워드 검색 */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]"
          style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
        >
          <Search size={15} style={{color: 'var(--color-text-hint)', flexShrink: 0}}/>
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="닉네임 · 이메일 검색"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{color: 'var(--color-text-main)'}}
          />
          <button
            onClick={handleSearch}
            className="text-xs font-semibold px-2 py-0.5 rounded-lg transition-colors"
            style={{background: 'var(--color-primary)', color: '#fff'}}
          >
            검색
          </button>
        </div>
        
        {/* 상태 필터 */}
        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-main)',
          }}
        >
          {STATUS_FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      
      {/* 테이블 */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{border: '1px solid var(--color-border)'}}
      >
        {/* 테이블 헤더 */}
        <div
          className="grid text-xs font-semibold px-4 py-3"
          style={{
            gridTemplateColumns: '60px 1fr 1fr 80px 60px 80px 120px',
            background: 'var(--color-surface-sunken)',
            color: 'var(--color-text-hint)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span>ID</span>
          <span>닉네임</span>
          <span>이메일</span>
          <span>상태</span>
          <span>경고</span>
          <span>매너점수</span>
          <span>가입일</span>
        </div>
        
        {/* 로딩 */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{color: 'var(--color-primary)'}}/>
          </div>
        )}
        
        {/* 빈 상태 */}
        {!isLoading && members.length === 0 && (
          <div className="py-16 text-center text-sm" style={{color: 'var(--color-text-hint)'}}>
            조건에 맞는 회원이 없습니다.
          </div>
        )}
        
        {/* 목록 */}
        {!isLoading && members.map(m => {
          const sc = STATUS_COLORS[m.status]
          return (
            <Link
              key={m.memberId}
              to={`/admin/members/${m.memberId}`}
              className="grid items-center px-4 py-3 text-sm no-underline transition-colors hover:bg-[var(--color-surface-raised)]"
              style={{
                gridTemplateColumns: '60px 1fr 1fr 80px 60px 80px 120px',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-text-main)',
              }}
            >
              {/* ID */}
              <span
                className="font-mono text-xs"
                style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
              >
                {m.memberId}
              </span>
              {/* 닉네임 */}
              <span className="font-semibold truncate pr-3">{m.nickname}</span>
              {/* 이메일 */}
              <span className="truncate pr-3" style={{color: 'var(--color-text-sub)'}}>{m.email}</span>
              {/* 상태 배지 */}
              <span>
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{color: sc.color, background: sc.bg}}
                >
                  {STATUS_LABELS[m.status]}
                </span>
              </span>
              {/* 경고 횟수 */}
              <span
                className="text-xs font-bold"
                style={{
                  color: m.warningCount > 0 ? 'var(--color-accent)' : 'var(--color-text-hint)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                }}
              >
                {m.warningCount}회
              </span>
              {/* 매너점수 */}
              <span
                className="text-xs font-bold"
                style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
              >
                {Number(m.mannerScore).toFixed(1)}
              </span>
              {/* 가입일 */}
              <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>
                {m.createdAt.slice(0, 10)}
              </span>
            </Link>
          )
        })}
      </div>
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{border: '1px solid var(--color-border)', color: 'var(--color-text-sub)'}}
          >
            <ChevronLeft size={15}/>
          </button>
          <span className="text-sm px-2" style={{color: 'var(--color-text-sub)'}}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{border: '1px solid var(--color-border)', color: 'var(--color-text-sub)'}}
          >
            <ChevronRight size={15}/>
          </button>
        </div>
      )}
    </div>
  )
}
