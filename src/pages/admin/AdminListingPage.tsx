/**
 * AdminListingPage — 관리자 게시글 관리 (/admin/listings)
 *
 * 기능:
 *   - 게시글 목록 조회 (상태·종목·키워드 필터 + 페이지네이션)
 *   - 신고수 기준 정렬로 위험 게시글 우선 노출
 *   - 숨김(HIDE) / 삭제(DELETE) 조치 + 사유 입력
 *   - 게시글 상세 모달 (내용·이미지·판매자 정보)
 */
import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type {PostStatus, Sport} from '../../features/admin/api/adminApi'
import {getAdminPost, getAdminPosts, processAdminPost,} from '../../features/admin/api/adminApi'
import {formatPrice} from '../../utils/format'

// ── 상수 ─────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PostStatus, string> = {
  ON_SALE: '판매중',
  RESERVED: '예약중',
  SOLD: '거래완료',
  HIDDEN: '숨김',
  DELETED: '삭제됨',
}

const STATUS_COLORS: Record<PostStatus, { color: string; bg: string }> = {
  ON_SALE: {color: 'var(--color-success)', bg: 'rgba(0,179,110,.1)'},
  RESERVED: {color: 'var(--color-warning)', bg: 'rgba(255,149,0,.1)'},
  SOLD: {color: 'var(--color-info)', bg: 'rgba(14,165,233,.1)'},
  HIDDEN: {color: 'var(--color-text-hint)', bg: 'rgba(0,0,0,.06)'},
  DELETED: {color: 'var(--color-accent)', bg: 'rgba(255,46,77,.1)'},
}

const SPORT_OPTIONS: { value: string; label: string }[] = [
  {value: '', label: '전체 종목'},
  {value: 'SOCCER', label: '축구'},
  {value: 'BASEBALL', label: '야구'},
  {value: 'BASKETBALL', label: '농구'},
  {value: 'VOLLEYBALL', label: '배구'},
  {value: 'ESPORTS', label: 'e스포츠'},
  {value: 'ETC', label: '기타'},
]

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  {value: '', label: '전체 상태'},
  {value: 'ON_SALE', label: '판매중'},
  {value: 'HIDDEN', label: '숨김'},
  {value: 'DELETED', label: '삭제됨'},
]

// ── 게시글 상세 모달 ──────────────────────────────────────────────────────────

function PostDetailModal({
                           postId,
                           onClose,
                         }: {
  postId: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [action, setAction] = useState<'HIDE' | 'DELETE' | null>(null)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  
  const {data: post, isLoading} = useQuery({
    queryKey: ['admin-post', postId],
    queryFn: () => getAdminPost(postId),
  })
  
  const {mutate: doAction, isPending} = useMutation({
    mutationFn: () => processAdminPost(postId, {action: action!, reason: reason || undefined}),
    onSuccess() {
      queryClient.invalidateQueries({queryKey: ['admin-posts']})
      queryClient.invalidateQueries({queryKey: ['admin-post', postId]})
      setDone(true)
    },
  })
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background: 'rgba(0,0,0,.55)'}}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface border border-border"
      >
        {/* 모달 헤더 */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 z-10"
          style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2
            className="text-base font-bold text-text-main" style={{fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            게시글 상세
          </h2>
          <button onClick={onClose} className="text-text-hint">
            <X size={20}/>
          </button>
        </div>
        
        {/* 본문 */}
        <div className="px-6 py-5">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-accent"/>
            </div>
          )}
          
          {post && !done && (
            <div className="flex flex-col gap-5">
              {/* 이미지 썸네일 */}
              {post.imageUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {post.imageUrls.slice(0, 5).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`이미지 ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-xl flex-shrink-0 border border-border"
                    />
                  ))}
                </div>
              )}
              
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['제목', post.title],
                  ['판매가', formatPrice(post.price)],
                  ['종목', post.sport],
                  ['등급', post.grade],
                  ['사이즈', post.size],
                  ['거래방식', post.deliveryType],
                  ['판매자', `${post.sellerNickname} (${post.sellerEmail})`],
                  ['신고수', `${post.reportCount}건`],
                  ['조회수', `${post.viewCount}회`],
                  ['찜수', `${post.wishCount}개`],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <span className="text-xs block mb-0.5 text-text-hint">
                      {label}
                    </span>
                    <span className="font-medium text-text-main">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* 본문 내용 */}
              <div>
                <p className="text-xs mb-1.5 text-text-hint">게시글 내용</p>
                <div
                  className="px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: 'var(--color-surface-raised)',
                    color: 'var(--color-text-sub)',
                    maxHeight: 160,
                    overflowY: 'auto',
                  }}
                >
                  {post.content}
                </div>
              </div>
              
              {/* 상태 표시 */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: STATUS_COLORS[post.status].bg,
                    color: STATUS_COLORS[post.status].color,
                  }}
                >
                  {STATUS_LABELS[post.status]}
                </span>
                {post.reportCount > 0 && (
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 text-accent"
                    style={{background: 'rgba(255,46,77,.1)'}}
                  >
                    <AlertTriangle size={11}/>
                    신고 {post.reportCount}건
                  </span>
                )}
              </div>
              
              {/* 조치 영역 (DELETED가 아닐 때만) */}
              {post.status !== 'DELETED' && (
                <div
                  className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-raised border border-border"
                >
                  <p
                    className="text-sm font-bold text-text-main"
                    style={{fontFamily: "'Giants','Pretendard',sans-serif"}}
                  >
                    게시글 조치
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAction(a => a === 'HIDE' ? null : 'HIDE')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: action === 'HIDE' ? 'rgba(255,149,0,.12)' : 'var(--color-surface)',
                        color: action === 'HIDE' ? 'var(--color-warning)' : 'var(--color-text-sub)',
                        border: `1px solid ${action === 'HIDE' ? 'rgba(255,149,0,.3)' : 'var(--color-border)'}`,
                      }}
                    >
                      <EyeOff size={13}/>
                      숨김 처리
                    </button>
                    <button
                      onClick={() => setAction(a => a === 'DELETE' ? null : 'DELETE')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: action === 'DELETE' ? 'rgba(255,46,77,.08)' : 'var(--color-surface)',
                        color: action === 'DELETE' ? 'var(--color-accent)' : 'var(--color-text-sub)',
                        border: `1px solid ${action === 'DELETE' ? 'rgba(255,46,77,.25)' : 'var(--color-border)'}`,
                      }}
                    >
                      <Trash2 size={13}/>
                      삭제 처리
                    </button>
                  </div>
                  
                  {action && (
                    <>
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="조치 사유 입력 (선택)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-main)',
                        }}
                      />
                      <button
                        onClick={() => doAction()}
                        disabled={isPending}
                        className="w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{
                          background: action === 'DELETE' ? 'var(--color-accent)' : 'var(--color-warning)',
                        }}
                      >
                        {isPending
                          ? <><Loader2 size={13} className="animate-spin"/>처리 중...</>
                          : action === 'DELETE' ? <><Trash2 size={13}/>삭제 확정</> : <><EyeOff size={13}/>숨김 확정</>}
                      </button>
                    </>
                  )}
                </div>
              )}
              
              {/* 게시글 링크 */}
              <Link
                to={`/listing/${post.postId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium underline hover:text-[var(--color-accent)] text-text-sub"
              >
                게시글 직접 보기
              </Link>
            </div>
          )}
          
          {done && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{background: 'rgba(0,179,110,.1)'}}
              >
                <FileText size={22} className="text-success"/>
              </div>
              <p
                className="font-bold text-success" style={{fontFamily: "'Giants','Pretendard',sans-serif"}}
              >
                조치 완료
              </p>
              <button
                onClick={onClose}
                className="mt-2 text-sm font-medium hover:text-[var(--color-accent)] text-text-sub"
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 게시글 행 컴포넌트 ────────────────────────────────────────────────────────


export default function AdminListingPage() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sport, setSport] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  
  const {data, isLoading, isError} = useQuery({
    queryKey: ['admin-posts', keyword, sport, status, page],
    queryFn: () => getAdminPosts({
      keyword: keyword || undefined,
      sport: (sport as Sport) || undefined,
      status: (status as PostStatus) || undefined,
      page,
      size: 20,
    }),
    staleTime: 30_000,
  })
  
  // 빠른 조치 (목록에서 바로 숨김)
  const {mutate: quickHide, isPending: isHiding} = useMutation({
    mutationFn: (postId: number) => processAdminPost(postId, {action: 'HIDE'}),
    onSuccess() {
      queryClient.invalidateQueries({queryKey: ['admin-posts']})
    },
  })
  
  const posts = data?.content ?? []
  const totalPages = data?.totalPages ?? 1
  
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setKeyword(searchInput.trim())
    setPage(0)
  }
  
  return (
    <div className="p-6 md:p-8 min-h-screen bg-bg">
      
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background: 'rgba(0,33,71,.1)', color: 'var(--color-primary)'}}
        >
          <FileText size={18}/>
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{fontFamily: "'Giants','Pretendard',sans-serif"}}>
            게시글 관리
          </h1>
          <p className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>
            총 {data?.totalElements ?? 0}개 게시글 · 신고순 정렬
          </p>
        </div>
      </div>
      
      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* 키워드 검색 */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1" style={{minWidth: 200}}>
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-hint"
            />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="제목·판매자 검색"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-main)',
              }}
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-xl text-sm font-medium text-white flex-shrink-0 bg-primary"
          >
            검색
          </button>
        </form>
        
        {/* 종목 필터 */}
        <select
          value={sport}
          onChange={e => {
            setSport(e.target.value);
            setPage(0)
          }}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-sub)',
          }}
        >
          {SPORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        
        {/* 상태 필터 */}
        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value);
            setPage(0)
          }}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-sub)',
          }}
        >
          {STATUS_FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        
        {/* 활성 필터 초기화 */}
        {(keyword || sport || status) && (
          <button
            onClick={() => {
              setKeyword('');
              setSearchInput('');
              setSport('');
              setStatus('');
              setPage(0)
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-accent"
          >
            <X size={13}/>
            초기화
          </button>
        )}
      </div>
      
      {/* 테이블 */}
      <div
        className="rounded-2xl overflow-hidden bg-surface border border-border"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-accent"/>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <AlertCircle size={22} className="text-accent"/>
            <p className="text-sm text-text-hint">게시글 목록을 불러오지 못했습니다.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <FileText size={28} className="border-border"/>
            <p className="text-sm text-text-hint">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{borderCollapse: 'collapse'}}>
              <thead>
              <tr className="border-b border-border bg-surface-sunken">
                {['ID', '제목·판매자', '가격', '상태', '신고', '등록일', ''].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-text-hint"
                  >
                    {h}
                  </th>
                ))}
              </tr>
              </thead>
              <tbody>
              {posts.map(post => (
                <tr
                  key={post.postId}
                  className="border-b transition-colors border-border hover:bg-surface-raised cursor-pointer"
                  onClick={() => setSelectedPostId(post.postId)}
                >
                  <td className="px-4 py-3 text-xs text-text-hint whitespace-nowrap">
                    <span style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>{post.postId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium line-clamp-1 text-text-main" style={{maxWidth: 260}}>
                      {post.title}
                    </p>
                    <p className="text-xs mt-0.5 text-text-hint">
                      {post.sellerNickname} · {post.sport}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-sub whitespace-nowrap">
                    {formatPrice(post.price)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{
                          background: STATUS_COLORS[post.status].bg,
                          color: STATUS_COLORS[post.status].color,
                        }}
                      >
                        {STATUS_LABELS[post.status]}
                      </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {post.reportCount > 0 ? (
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit text-accent"
                        style={{background: 'rgba(255,46,77,.1)'}}
                      >
                          <AlertTriangle size={10}/>
                        {post.reportCount}
                        </span>
                    ) : (
                      <span className="text-xs text-text-hint">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-hint whitespace-nowrap">
                    {post.createdAt.slice(0, 10)}
                  </td>
                  {/* 빠른 숨김 버튼 */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {post.status === 'ON_SALE' && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          quickHide(post.postId)
                        }}
                        disabled={isHiding}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 text-warning"
                        style={{background: 'rgba(255,149,0,.1)'}}
                        title="즉시 숨김"
                      >
                        <EyeOff size={11}/>
                        숨김
                      </button>
                    )}
                    {post.status === 'HIDDEN' && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedPostId(post.postId)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 text-text-hint"
                        style={{background: 'rgba(0,0,0,.05)'}}
                        title="상세 보기"
                      >
                        <Eye size={11}/>
                        상세
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-xl transition-all disabled:opacity-30 bg-surface border border-border"
          >
            <ChevronLeft size={16} className="text-text-sub"/>
          </button>
          {Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
            const pageNum = Math.max(0, Math.min(page - 3, totalPages - 7)) + i
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className="w-9 h-9 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: page === pageNum ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: page === pageNum ? '#fff' : 'var(--color-text-sub)',
                  border: `1px solid ${page === pageNum ? 'transparent' : 'var(--color-border)'}`,
                }}
              >
                {pageNum + 1}
              </button>
            )
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-xl transition-all disabled:opacity-30 bg-surface border border-border"
          >
            <ChevronRight size={16} className="text-text-sub"/>
          </button>
        </div>
      )}
      
      {/* 게시글 상세 모달 */}
      {selectedPostId !== null && (
        <PostDetailModal
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </div>
  )
}
