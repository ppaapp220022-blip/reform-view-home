/**
 * CommunityPage — 커뮤니티 (Screen 8)
 *
 * 구성:
 *   SportTabs      — 종목 탭 (전체/축구/야구/농구/배구/e스포츠/기타)
 *   PostList       — getCommunityPosts useQuery 연동 (실제 API)
 *   SortBar        — 최신순 / 인기순
 *   WriteModal     — 게시글 작성 (createCommunityPost useMutation)
 *   SidebarTopPosts — 인기글 getPopularPosts useQuery 연동
 *
 * 백엔드 API:
 *   GET  /api/community             — 목록 (sport 필터, 페이지)
 *   POST /api/community             — 게시글 작성
 *   POST /api/community/{id}/like   — 좋아요 토글 → likeCount 반환
 *   GET  /api/community/posts/popular — 인기글
 */
import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {
  ThumbsUp, MessageSquare, Eye, Search, PenSquare, X,
  ChevronRight, TrendingUp, Clock, Loader2, AlertCircle,
} from 'lucide-react'
import type {Sport} from '../../types/listing'
import type {CommunityPostListItem, CommunityPostRequest} from '../../types/community'
import {
  getCommunityPosts,
  createCommunityPost,
  togglePostLike,
  getPopularPosts,
} from '../../features/community/api/communityApi'

// ── 상수 ─────────────────────────────────────────────────────────────────────

/** 종목 탭 — 백엔드 sport 필터에 대응 */
const SPORT_TABS: { key: Sport | 'all'; label: string }[] = [
  {key: 'all', label: '전체'},
  {key: 'SOCCER', label: '축구'},
  {key: 'BASEBALL', label: '야구'},
  {key: 'BASKETBALL', label: '농구'},
  {key: 'VOLLEYBALL', label: '배구'},
  {key: 'ESPORTS', label: 'e스포츠'},
  {key: 'ETC', label: '기타'},
]

/** 아바타 폴백 컬러 (작성자 프로필 이미지 없을 때) */
const AVATAR_COLORS = ['#1A3051', '#B5222B', '#034694', '#1A7A40', '#A50044', '#6B0078', '#C8102E']

function avatarColor(memberId: number) {
  return AVATAR_COLORS[memberId % AVATAR_COLORS.length]
}

/** 날짜 포맷: ISO → "N시간 전" 형태 */
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`
  return `${Math.floor(diff / 604800)}주 전`
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 게시글 카드 */
function PostCard({
                    post,
                    onLike,
                  }: {
  post: CommunityPostListItem
  onLike: (commId: number) => void
}) {
  const navigate = useNavigate()
  return (
    <article
      className="px-4 py-4 transition-colors cursor-pointer hover:bg-[var(--color-surface-raised)]"
      style={{borderBottom: '1px solid var(--color-border)'}}
      onClick={() => navigate(`/community/${post.commId}`)}
    >
      <div className="flex gap-3">
        {/* 아바타 */}
        {post.author.profileImageUrl ? (
          <img
            src={post.author.profileImageUrl}
            alt={post.author.nickname}
            className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{background: avatarColor(post.author.memberId), fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
          >
            {post.author.nickname.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* 작성자 + 종목 + 시간 */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold" style={{color: 'var(--color-text-main)'}}>
              {post.author.nickname}
            </span>
            <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>
              · {timeAgo(post.createdAt)}
            </span>
            {post.sport && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-hint)',
                border: '1px solid var(--color-border)'
              }}>
                {post.sport}
              </span>
            )}
          </div>

          {/* 제목 */}
          <h3 className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2"
              style={{color: 'var(--color-text-main)'}}>
            {post.commTitle}
          </h3>

          {/* 팀 카테고리 (있으면) */}
          {post.teamCategory && (
            <p className="text-xs mb-2" style={{color: 'var(--color-text-hint)'}}>
              {post.teamCategory}
            </p>
          )}

          {/* 메타 — 좋아요/댓글/조회 */}
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(post.commId)
              }}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{color: 'var(--color-text-hint)'}}
            >
              <ThumbsUp size={12}/>
              {post.likeCount}
            </button>
            <span className="flex items-center gap-1.5 text-xs" style={{color: 'var(--color-text-hint)'}}>
              <MessageSquare size={12}/>{post.commentCount}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{color: 'var(--color-text-hint)'}}>
              <Eye size={12}/>{post.commViewCount.toLocaleString('ko-KR')}
            </span>
          </div>
        </div>
        <ChevronRight size={16} color="var(--color-border)" className="flex-shrink-0 mt-2"/>
      </div>
    </article>
  )
}

/** 게시글 작성 모달 */
function WriteModal({onClose, onSuccess}: { onClose: () => void; onSuccess: () => void }) {
  const [sport, setSport] = useState<Sport>('SOCCER')
  const [teamCategory, setTeamCategory] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const {mutate, isPending} = useMutation({
    mutationFn: (req: CommunityPostRequest) => createCommunityPost(req),
    onSuccess: () => {
      onSuccess()   // 목록 리프레시 콜백
      onClose()
    },
  })

  function handleSubmit() {
    if (!title.trim() || !content.trim()) return
    mutate({
      sport,
      teamCategory: teamCategory.trim() || undefined,
      commTitle: title.trim(),
      commContent: content.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{background: 'rgba(13,27,42,.45)', backdropFilter: 'blur(4px)'}}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col"
        style={{
          background: 'var(--color-surface)',
          boxShadow: '0 -8px 32px rgba(0,33,71,.15)',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{borderBottom: '1px solid var(--color-border)'}}>
          <h2 className="font-bold text-base" style={{color: 'var(--color-text-main)'}}>게시글 작성</h2>
          <button onClick={onClose} aria-label="닫기"><X size={20} color="var(--color-text-sub)"/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* 종목 선택 */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{color: 'var(--color-text-main)'}}>종목</label>
            <div className="flex flex-wrap gap-2">
              {SPORT_TABS.filter(s => s.key !== 'all').map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSport(s.key as Sport)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: sport === s.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                    color: sport === s.key ? '#fff' : 'var(--color-text-sub)',
                    border: `1px solid ${sport === s.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 팀/구단 (선택) */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{color: 'var(--color-text-main)'}}>팀/구단
              (선택)</label>
            <input
              type="text"
              value={teamCategory}
              onChange={(e) => setTeamCategory(e.target.value)}
              placeholder="예: 맨체스터 유나이티드, KIA 타이거즈"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-main)'
              }}
            />
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{color: 'var(--color-text-main)'}}>
              제목 <span style={{color: 'var(--color-accent)'}}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요"
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-main)'
              }}
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{color: 'var(--color-text-main)'}}>
              내용 <span style={{color: 'var(--color-accent)'}}>*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력해주세요"
              rows={7}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-main)'
              }}
            />
            <p className="text-xs mt-1 text-right" style={{color: 'var(--color-text-hint)'}}>{content.length}/2000</p>
          </div>
        </div>

        {/* 등록 버튼 */}
        <div className="px-5 py-4" style={{borderTop: '1px solid var(--color-border)'}}>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isPending}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{background: title && content ? 'var(--color-accent)' : 'var(--color-text-hint)'}}
          >
            {isPending && <Loader2 size={16} className="animate-spin"/>}
            {isPending ? '등록 중...' : '게시글 등록하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const queryClient = useQueryClient()
  const [sportFilter, setSportFilter] = useState<Sport | 'all'>('all')
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')
  const [search, setSearch] = useState('')
  const [writeOpen, setWriteOpen] = useState(false)

  /* 게시글 목록 조회 */
  const {data, isLoading, isError} = useQuery({
    queryKey: ['communityPosts', {sport: sportFilter, sort}],
    queryFn: () => getCommunityPosts({
      sport: sportFilter !== 'all' ? sportFilter : undefined,
      size: 30,
      page: 0,
    }),
    staleTime: 30_000,
  })

  /* 인기글 조회 (사이드바) */
  const {data: popularData} = useQuery({
    queryKey: ['communityPopular'],
    queryFn: () => getPopularPosts(5),
    staleTime: 60_000,
  })

  /* 클라이언트 정렬 + 검색 필터링 */
  const posts = data?.content ?? []
  const filtered = (() => {
    let list = posts
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.commTitle.toLowerCase().includes(q) ||
        p.author.nickname.toLowerCase().includes(q)
      )
    }
    if (sort === 'popular') {
      return [...list].sort((a, b) => b.likeCount - a.likeCount)
    }
    return list
  })()

  /**
   * 좋아요 토글 핸들러
   * 낙관적 UI: 목록 캐시를 즉시 업데이트 → togglePostLike API 호출 → 실패 시 무효화
   */
  async function handleLike(commId: number) {
    try {
      const newCount = await togglePostLike(commId)
      /* 서버 응답으로 캐시 갱신 */
      queryClient.setQueryData<typeof data>(
        ['communityPosts', {sport: sportFilter, sort}],
        (old) => {
          if (!old) return old
          return {
            ...old,
            content: old.content.map(p =>
              p.commId === commId ? {...p, likeCount: newCount} : p
            ),
          }
        },
      )
    } catch {
      /* 실패 시 서버 데이터로 리셋 */
      queryClient.invalidateQueries({queryKey: ['communityPosts']})
    }
  }

  /* 게시글 등록 후 목록 무효화 */
  function handleWriteSuccess() {
    queryClient.invalidateQueries({queryKey: ['communityPosts']})
  }

  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      {writeOpen && (
        <WriteModal
          onClose={() => setWriteOpen(false)}
          onSuccess={handleWriteSuccess}
        />
      )}

      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6 md:py-10">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-bold mb-1"
              style={{
                color: 'var(--color-text-main)',
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                letterSpacing: '0.04em'
              }}
            >
              COMMUNITY
            </h1>
            <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>유니폼·스포츠 이야기를 나눠보세요.</p>
          </div>
          <button
            onClick={() => setWriteOpen(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{background: 'var(--color-accent)'}}
          >
            <PenSquare size={16}/>글쓰기
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {/* 검색 */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <Search size={16} color="var(--color-text-hint)"/>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="게시글 제목, 작성자 검색..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{color: 'var(--color-text-main)'}}
              />
              {search && (
                <button onClick={() => setSearch('')}><X size={14} color="var(--color-text-hint)"/></button>
              )}
            </div>

            {/* 종목 탭 */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4" style={{scrollbarWidth: 'none'}}>
              {SPORT_TABS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSportFilter(s.key)}
                  className="whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0"
                  style={{
                    background: sportFilter === s.key ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: sportFilter === s.key ? '#fff' : 'var(--color-text-sub)',
                    border: `1px solid ${sportFilter === s.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 정렬 바 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{color: 'var(--color-text-sub)'}}>
                <span className="font-bold" style={{color: 'var(--color-text-main)'}}>
                  {data?.totalElements ?? filtered.length}
                </span>개 게시글
              </span>
              <div className="flex gap-1.5">
                {(['latest', 'popular'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: sort === s ? 'var(--color-surface-raised)' : 'transparent',
                      color: sort === s ? 'var(--color-text-main)' : 'var(--color-text-hint)',
                      border: `1px solid ${sort === s ? 'var(--color-border)' : 'transparent'}`,
                    }}
                  >
                    {s === 'latest' ? <Clock size={11}/> : <TrendingUp size={11}/>}
                    {s === 'latest' ? '최신순' : '인기순'}
                  </button>
                ))}
              </div>
            </div>

            {/* 게시글 목록 */}
            <div className="rounded-2xl overflow-hidden"
                 style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
              {isLoading ? (
                /* 로딩 스켈레톤 */
                <div className="flex flex-col">
                  {Array.from({length: 5}).map((_, i) => (
                    <div key={i} className="px-4 py-4 animate-pulse"
                         style={{borderBottom: '1px solid var(--color-border)'}}>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full flex-shrink-0"
                             style={{background: 'var(--color-surface-raised)'}}/>
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="h-3 rounded w-1/3" style={{background: 'var(--color-surface-raised)'}}/>
                          <div className="h-4 rounded" style={{background: 'var(--color-surface-raised)'}}/>
                          <div className="h-3 rounded w-1/4" style={{background: 'var(--color-surface-raised)'}}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center py-16 gap-3">
                  <AlertCircle size={28} color="var(--color-error)"/>
                  <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>게시글을 불러오지 못했습니다.</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <MessageSquare size={36} color="var(--color-border)"/>
                  <div className="text-center">
                    <p className="font-display font-bold" style={{color: 'var(--color-text-main)'}}>게시글이 없어요</p>
                    <p className="text-sm mt-1" style={{color: 'var(--color-text-sub)'}}>첫 번째 게시글을 작성해보세요!</p>
                  </div>
                  <button
                    onClick={() => setWriteOpen(true)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{background: 'var(--color-accent)'}}
                  >
                    글쓰기
                  </button>
                </div>
              ) : (
                filtered.map((post) => (
                  <PostCard key={post.commId} post={post} onLike={handleLike}/>
                ))
              )}
            </div>
          </div>

          {/* 우: 사이드바 (데스크탑) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            {/* 인기 게시글 — getPopularPosts API 연동 */}
            <div className="rounded-2xl p-4"
                 style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
              <h3 className="text-xs font-semibold tracking-widest mb-3"
                  style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>TOP POSTS</h3>
              <div className="flex flex-col gap-3">
                {(popularData ?? []).map((p, i) => (
                  <div key={p.commId} className="flex items-start gap-2">
                    <span
                      className="text-sm font-bold flex-shrink-0 w-5 text-center"
                      style={{
                        color: i === 0 ? 'var(--color-accent)' : i === 1 ? 'var(--color-gold)' : 'var(--color-text-hint)',
                        fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold line-clamp-2 leading-snug"
                         style={{color: 'var(--color-text-main)'}}>
                        {p.title}
                      </p>
                    </div>
                  </div>
                ))}
                {!popularData && (
                  <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>불러오는 중...</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 모바일 글쓰기 FAB */}
      <button
        onClick={() => setWriteOpen(true)}
        className="fixed bottom-20 right-4 md:hidden w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 z-30"
        style={{background: 'var(--color-accent)', boxShadow: '0 8px 24px rgba(255,46,77,.4)'}}
        aria-label="글쓰기"
      >
        <PenSquare size={22} color="#fff"/>
      </button>
    </div>
  )
}
