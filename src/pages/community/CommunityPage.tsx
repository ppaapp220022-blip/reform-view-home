/**
 * CommunityPage — 커뮤니티 (Screen 8)
 *
 * 구성:
 *   CategoryTabs   — 전체/자유/유니폼 정보/질문/경기 후기 탭
 *   PostList       — 게시글 목록 (제목, 작성자, 좋아요, 댓글, 날짜)
 *   SortBar        — 최신순 / 인기순
 *   WriteButton    — 글쓰기 FAB (우하단)
 *   WriteModal     — 게시글 작성 인라인 모달
 *
 * 데이터: 목 데이터 (추후 useQuery 연동)
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ThumbsUp, MessageSquare, Eye, Search, PenSquare, X,
  ChevronRight, TrendingUp, Clock,
} from 'lucide-react'

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

type PostCategory = 'all' | 'free' | 'info' | 'question' | 'review'

interface Post {
  id: number
  category: Exclude<PostCategory, 'all'>
  title: string
  content: string
  authorNickname: string
  authorAvatarColor: string
  likeCount: number
  commentCount: number
  viewCount: number
  createdAt: string
  isLiked: boolean
  tags: string[]
}

const MOCK_POSTS: Post[] = [
  { id:1,  category:'info',     title:'EPL 유니폼 등급 정리 — S/A/B/C 기준 완벽 가이드',   content:'안녕하세요, 유니폼 거래 5년차 선배가 정리한 등급 기준입니다. 많은 분들이 A급과 B급 기준을 헷갈려 하셔서...',         authorNickname:'jersey_expert', authorAvatarColor:'#1A3051', likeCount:142, commentCount:38, viewCount:1240, createdAt:'2시간 전', isLiked:false, tags:['EPL','등급가이드'] },
  { id:2,  category:'review',   title:'맨유 홈경기 직관 후기 + 굿즈 쇼핑 정보',            content:'지난 주 올드 트래포드에서 직관했습니다! 어센틱 유니폼은 현장에서 10만원대에 살 수 있더라고요...',                    authorNickname:'manu_forever',  authorAvatarColor:'#B5222B', likeCount:89,  commentCount:22, viewCount:845,  createdAt:'5시간 전', isLiked:true,  tags:['맨유','직관후기'] },
  { id:3,  category:'question', title:'나이키 어센틱 vs 레플리카 차이가 뭔가요?',           content:'유니폼 처음 구매하는 초보입니다. 어센틱이랑 레플리카가 어떻게 다른지 잘 모르겠어요...',                            authorNickname:'newbie_fan',    authorAvatarColor:'#1A7A40', likeCount:12,  commentCount:15, viewCount:312,  createdAt:'1일 전', isLiked:false, tags:['질문','초보'] },
  { id:4,  category:'free',     title:'내가 모은 EPL 구단 10년치 유니폼 컬렉션 공개',       content:'10년 동안 모은 유니폼 컬렉션을 공개합니다. 총 43벌...',                                                             authorNickname:'collector_pro', authorAvatarColor:'#034694', likeCount:234, commentCount:67, viewCount:3100, createdAt:'2일 전', isLiked:true,  tags:['컬렉션','EPL'] },
  { id:5,  category:'info',     title:'KBO 구단별 어센틱 구매처 총정리 2024',              content:'KBO 구단 공식 어센틱은 구단마다 구매처가 달라서 정리해봤습니다...',                                                authorNickname:'kbo_master',    authorAvatarColor:'#D50032', likeCount:78,  commentCount:19, viewCount:920,  createdAt:'3일 전', isLiked:false, tags:['KBO','구매처'] },
  { id:6,  category:'question', title:'T1 유니폼 세탁 방법 알려주세요',                    content:'T1 유니폼 처음 샀는데 세탁을 어떻게 해야 할지 모르겠어요. 손세탁만 해야 하나요?',                                   authorNickname:'esports_new',   authorAvatarColor:'#C8102E', likeCount:8,   commentCount:11, viewCount:180,  createdAt:'4일 전', isLiked:false, tags:['T1','세탁'] },
  { id:7,  category:'review',   title:'리버풀 홈 어센틱 re:form에서 구매 후기',            content:'re:form에서 처음 구매했는데 정말 만족스럽습니다. 에스크로 덕분에 안심하고 거래할 수 있었어요!',                      authorNickname:'lfc_supporter', authorAvatarColor:'#C8102E', likeCount:55,  commentCount:14, viewCount:660,  createdAt:'5일 전', isLiked:false, tags:['리버풀','구매후기'] },
  { id:8,  category:'free',     title:'내 드림 유니폼 — 호나우두 07/08 CL 어센틱',         content:'언젠가 꼭 갖고 싶은 유니폼 1위... 누군가 갖고 계신 분 연락주세요',                                                  authorNickname:'ronaldo_fan',   authorAvatarColor:'#6B0078', likeCount:61,  commentCount:29, viewCount:730,  createdAt:'1주 전', isLiked:true,  tags:['드림유니폼','맨유'] },
]

// ── 상수 ─────────────────────────────────────────────────────────────────────

const CATEGORIES: { key: PostCategory; label: string }[] = [
  { key:'all',      label:'전체' },
  { key:'free',     label:'자유' },
  { key:'info',     label:'유니폼 정보' },
  { key:'question', label:'질문' },
  { key:'review',   label:'경기·거래 후기' },
]

const CATEGORY_META: Record<Exclude<PostCategory,'all'>, { label: string; bg: string; text: string }> = {
  free:     { label:'자유',      bg:'rgba(90,106,122,.10)', text:'var(--color-text-sub)' },
  info:     { label:'정보',      bg:'rgba(0,33,71,.08)',    text:'var(--color-primary)' },
  question: { label:'질문',      bg:'rgba(255,149,0,.10)', text:'var(--color-warning)' },
  review:   { label:'후기',      bg:'rgba(0,179,110,.10)', text:'var(--color-success)' },
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 게시글 카드 */
function PostCard({
  post, onLike,
}: {
  post: Post
  onLike: (id: number) => void
}) {
  const navigate = useNavigate()
  const cm = CATEGORY_META[post.category]
  return (
    <article
      className="px-4 py-4 transition-colors cursor-pointer hover:bg-[var(--color-surface-raised)]"
      style={{ borderBottom:'1px solid var(--color-border)' }}
      onClick={() => navigate(`/community/${post.id}`)}
    >
      <div className="flex gap-3">
        {/* 아바타 */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: post.authorAvatarColor, fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}
        >
          {post.authorNickname.slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {/* 카테고리 + 작성자 */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:cm.bg, color:cm.text }}>
              {cm.label}
            </span>
            <span className="text-xs" style={{ color:'var(--color-text-hint)' }}>{post.authorNickname}</span>
            <span className="text-xs" style={{ color:'var(--color-text-hint)' }}>· {post.createdAt}</span>
          </div>
          {/* 제목 */}
          <h3 className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2" style={{ color:'var(--color-text-main)' }}>
            {post.title}
          </h3>
          {/* 미리보기 */}
          <p className="text-xs leading-relaxed line-clamp-2 mb-2.5" style={{ color:'var(--color-text-sub)' }}>
            {post.content}
          </p>
          {/* 태그 */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {post.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background:'var(--color-surface-raised)', color:'var(--color-text-hint)', border:'1px solid var(--color-border)' }}>
                #{tag}
              </span>
            ))}
          </div>
          {/* 메타 — 조회/좋아요/댓글 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLike(post.id)}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: post.isLiked ? 'var(--color-accent)' : 'var(--color-text-hint)' }}
            >
              <ThumbsUp size={12} fill={post.isLiked ? 'var(--color-accent)' : 'none'} />
              {post.likeCount}
            </button>
            <span className="flex items-center gap-1.5 text-xs" style={{ color:'var(--color-text-hint)' }}>
              <MessageSquare size={12} />{post.commentCount}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color:'var(--color-text-hint)' }}>
              <Eye size={12} />{post.viewCount.toLocaleString('ko-KR')}
            </span>
          </div>
        </div>
        <ChevronRight size={16} color="var(--color-border)" className="flex-shrink-0 mt-2" />
      </div>
    </article>
  )
}

/** 글쓰기 모달 */
function WriteModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<Exclude<PostCategory,'all'>>('free')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  function handleSubmit() {
    if (!title.trim() || !content.trim()) return
    // 실제 구현: useMutation → POST /community/post
    alert('게시글이 등록되었습니다! (목 시뮬레이션)')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background:'rgba(13,27,42,.45)', backdropFilter:'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col"
        style={{
          background:'var(--color-surface)',
          boxShadow:'0 -8px 32px rgba(0,33,71,.15)',
          maxHeight:'90vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--color-border)' }}>
          <h2 className="font-bold text-base" style={{ color:'var(--color-text-main)' }}>게시글 작성</h2>
          <button onClick={onClose} aria-label="닫기"><X size={20} color="var(--color-text-sub)" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color:'var(--color-text-main)' }}>카테고리</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key as Exclude<PostCategory,'all'>)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: category===c.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                    color: category===c.key ? '#fff' : 'var(--color-text-sub)',
                    border:`1px solid ${category===c.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color:'var(--color-text-main)' }}>
              제목 <span style={{ color:'var(--color-accent)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요"
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background:'var(--color-surface-raised)', border:'1px solid var(--color-border)', color:'var(--color-text-main)' }}
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color:'var(--color-text-main)' }}>
              내용 <span style={{ color:'var(--color-accent)' }}>*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="내용을 입력해주세요"
              rows={7}
              maxLength={2000}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
              style={{ background:'var(--color-surface-raised)', border:'1px solid var(--color-border)', color:'var(--color-text-main)' }}
            />
            <p className="text-xs mt-1 text-right" style={{ color:'var(--color-text-hint)' }}>{content.length}/2000</p>
          </div>
        </div>

        {/* 등록 버튼 */}
        <div className="px-5 py-4" style={{ borderTop:'1px solid var(--color-border)' }}>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim()}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-50"
            style={{ background: title && content ? 'var(--color-accent)' : 'var(--color-text-hint)' }}
          >
            게시글 등록하기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [category, setCategory] = useState<PostCategory>('all')
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')
  const [search, setSearch] = useState('')
  const [writeOpen, setWriteOpen] = useState(false)

  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS)

  function toggleLike(id: number) {
    setPosts(prev => prev.map(p =>
      p.id === id
        ? { ...p, isLiked: !p.isLiked, likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1 }
        : p
    ))
  }

  const filtered = useMemo(() => {
    let list = posts
    if (category !== 'all') list = list.filter(p => p.category === category)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.authorNickname.toLowerCase().includes(q))
    }
    if (sort === 'popular') return [...list].sort((a,b) => b.likeCount - a.likeCount)
    return list
  }, [posts, category, sort, search])

  return (
    <div className="min-h-screen" style={{ background:'var(--color-bg)' }}>
      {writeOpen && <WriteModal onClose={() => setWriteOpen(false)} />}

      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6 md:py-10">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-bold mb-1"
              style={{ color:'var(--color-text-main)', fontFamily:"'IAMAPLAYER',Giants,sans-serif", letterSpacing:'0.04em' }}
            >
              COMMUNITY
            </h1>
            <p className="text-sm" style={{ color:'var(--color-text-sub)' }}>유니폼·스포츠 이야기를 나눠보세요.</p>
          </div>
          <button
            onClick={() => setWriteOpen(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ background:'var(--color-accent)' }}
          >
            <PenSquare size={16} />글쓰기
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {/* 검색 */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4"
              style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}
            >
              <Search size={16} color="var(--color-text-hint)" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="게시글 제목, 작성자 검색..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color:'var(--color-text-main)' }}
              />
              {search && <button onClick={() => setSearch('')}><X size={14} color="var(--color-text-hint)" /></button>}
            </div>

            {/* 카테고리 탭 */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth:'none' }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className="whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0"
                  style={{
                    background: category===c.key ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: category===c.key ? '#fff' : 'var(--color-text-sub)',
                    border:`1px solid ${category===c.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* 정렬 바 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color:'var(--color-text-sub)' }}>
                <span className="font-bold" style={{ color:'var(--color-text-main)' }}>{filtered.length}</span>개 게시글
              </span>
              <div className="flex gap-1.5">
                {(['latest','popular'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: sort===s ? 'var(--color-surface-raised)' : 'transparent',
                      color: sort===s ? 'var(--color-text-main)' : 'var(--color-text-hint)',
                      border:`1px solid ${sort===s ? 'var(--color-border)' : 'transparent'}`,
                    }}
                  >
                    {s === 'latest' ? <Clock size={11} /> : <TrendingUp size={11} />}
                    {s === 'latest' ? '최신순' : '인기순'}
                  </button>
                ))}
              </div>
            </div>

            {/* 게시글 목록 */}
            <div className="rounded-2xl overflow-hidden" style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4">
                  <MessageSquare size={36} color="var(--color-border)" />
                  <div className="text-center">
                    <p className="font-display font-bold" style={{ color:'var(--color-text-main)' }}>게시글이 없어요</p>
                    <p className="text-sm mt-1" style={{ color:'var(--color-text-sub)' }}>첫 번째 게시글을 작성해보세요!</p>
                  </div>
                  <button onClick={() => setWriteOpen(true)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background:'var(--color-accent)' }}>
                    글쓰기
                  </button>
                </div>
              ) : (
                filtered.map(post => (
                  <PostCard key={post.id} post={post} onLike={toggleLike} />
                ))
              )}
            </div>
          </div>

          {/* 우: 사이드바 (데스크탑) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            {/* 인기 태그 */}
            <div className="rounded-2xl p-4 mb-4" style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}>
              <h3 className="text-xs font-semibold tracking-widest mb-3" style={{ color:'var(--color-text-hint)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>HOT TAGS</h3>
              <div className="flex flex-wrap gap-2">
                {['EPL','맨유','KBO','LCK','등급가이드','T1','직관후기','컬렉션','세탁','구매후기'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearch(tag)}
                    className="text-xs px-2.5 py-1 rounded-full transition-colors"
                    style={{ background:'var(--color-surface-raised)', color:'var(--color-text-sub)', border:'1px solid var(--color-border)' }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 인기 게시글 */}
            <div className="rounded-2xl p-4" style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}>
              <h3 className="text-xs font-semibold tracking-widest mb-3" style={{ color:'var(--color-text-hint)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>TOP POSTS</h3>
              <div className="flex flex-col gap-3">
                {[...MOCK_POSTS].sort((a,b) => b.likeCount - a.likeCount).slice(0,4).map((p, i) => (
                  <div key={p.id} className="flex items-start gap-2">
                    <span
                      className="text-sm font-bold flex-shrink-0 w-5 text-center"
                      style={{ color: i === 0 ? 'var(--color-accent)' : i === 1 ? 'var(--color-gold)' : 'var(--color-text-hint)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold line-clamp-2 leading-snug" style={{ color:'var(--color-text-main)' }}>{p.title}</p>
                      <span className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color:'var(--color-text-hint)' }}>
                        <ThumbsUp size={9} /> {p.likeCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 모바일 글쓰기 FAB */}
      <button
        onClick={() => setWriteOpen(true)}
        className="fixed bottom-20 right-4 md:hidden w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 z-30"
        style={{ background:'var(--color-accent)', boxShadow:'0 8px 24px rgba(255,46,77,.4)' }}
        aria-label="글쓰기"
      >
        <PenSquare size={22} color="#fff" />
      </button>
    </div>
  )
}
