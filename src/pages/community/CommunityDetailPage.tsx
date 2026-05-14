/**
 * CommunityDetailPage — 커뮤니티 게시글 상세 (/community/:id)
 *
 * 구성:
 *   PostHeader    — 작성자 / 날짜 / 종목 태그 / 좋아요
 *   PostBody      — 본문 내용 + 첨부 이미지
 *   ReplySection  — 댓글 목록 (대댓글 포함) + 입력 폼
 *     ReplyItem   — 댓글 1개 (대댓글 표시 + 답글 달기 버튼)
 *     ChildReply  — 대댓글 1개
 *
 * 데이터: 목 데이터 (추후 useQuery로 교체)
 * 백엔드 DTO: CommunityPostDetailDTO / ReplyResponseDTO (children 포함)
 */
import {useRef, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
  AlertCircle,
  ChevronLeft,
  CornerDownRight,
  Eye,
  Flag,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Send,
  ThumbsUp,
} from 'lucide-react'
import type {Sport} from '../../types/listing'
import type {AuthorBrief, ReplyItem, ReplyRequest} from '../../types/community'
import ReportModal from '../../components/ui/ReportModal'
import {
  createReply,
  deleteReply,
  getCommunityPostDetail,
  getReplies,
  togglePostLike,
  toggleReplyLike,
} from '../../features/community/api/communityApi'
import useAuthStore from '../../store/authStore'

// ── 상수: 종목 레이블 ─────────────────────────────────────────────────────────
const SPORT_LABEL: Record<Sport | 'ETC', string> = {
  SOCCER: '축구', BASEBALL: '야구', BASKETBALL: '농구',
  VOLLEYBALL: '배구', ESPORTS: 'e스포츠', ETC: '기타',
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', {month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})
}

// ── 서브 컴포넌트: 아바타 ─────────────────────────────────────────────────────
function Avatar({author, size = 32}: { author: AuthorBrief; size?: number }) {
  if (author.profileImageUrl) {
    return (
      <img
        src={author.profileImageUrl}
        alt={author.nickname}
        className="rounded-full object-cover flex-shrink-0"
        style={{width: size, height: size}}
      />
    )
  }
  // 이니셜 아바타
  const colors = ['#002147', '#343F5B', '#1A3051', '#5A6A7A']
  const color = colors[author.memberId % colors.length]
  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
      style={{width: size, height: size, background: color, fontSize: size * 0.4}}
    >
      {author.nickname[0].toUpperCase()}
    </div>
  )
}

// ── 서브 컴포넌트: 대댓글 ────────────────────────────────────────────────────
function ChildReplyItem({
                          reply,
                          onLike,
                        }: {
  reply: ReplyItem
  onLike: (replyId: number) => void
}) {
  if (reply.isDeleted) {
    return (
      <div className="flex items-start gap-2 pl-8 py-2">
        <CornerDownRight size={14} style={{color: 'var(--color-border)', flexShrink: 0, marginTop: 2}}/>
        <p className="text-xs italic" style={{color: 'var(--color-text-hint)'}}>삭제된 댓글입니다.</p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 pl-8 py-2.5">
      {/* 들여쓰기 화살표 */}
      <CornerDownRight size={14} style={{color: 'var(--color-border)', flexShrink: 0, marginTop: 6}}/>

      <Avatar author={reply.author} size={26}/>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold" style={{color: 'var(--color-text-main)'}}>
            {reply.author.nickname}
          </span>
          <span className="text-[12px]" style={{color: 'var(--color-text-hint)'}}>
            {formatDate(reply.createdAt)}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{color: 'var(--color-text-main)'}}>
          {reply.replyContent}
        </p>
        {/* 대댓글 좋아요 */}
        <button
          onClick={() => onLike(reply.replyId)}
          className="flex items-center gap-1 mt-1.5 text-xs transition-colors"
          style={{color: reply.isLiked ? 'var(--color-accent)' : 'var(--color-text-hint)'}}
        >
          <ThumbsUp size={11}/>
          {reply.likeCount > 0 && reply.likeCount}
        </button>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트: 최상위 댓글 ───────────────────────────────────────────────
function TopReplyItem({
                        reply,
                        onLike,
                        onReplyTo,
                        onDelete,
                        replyingToId,
                        myMemberId,
                      }: {
  reply: ReplyItem
  onLike: (replyId: number) => void
  onReplyTo: (replyId: number, nickname: string) => void
  onDelete: (replyId: number) => void
  replyingToId: number | null
  myMemberId: number | null
}) {
  const isReplying = replyingToId === reply.replyId

  if (reply.isDeleted) {
    return (
      <div className="py-3" style={{borderBottom: '1px solid var(--color-border)'}}>
        <p className="text-sm italic" style={{color: 'var(--color-text-hint)'}}>삭제된 댓글입니다.</p>
        {/* 삭제된 댓글의 대댓글은 그대로 표시 */}
        {reply.children.map(child => (
          <ChildReplyItem key={child.replyId} reply={child} onLike={onLike}/>
        ))}
      </div>
    )
  }

  return (
    <div className="py-3" style={{borderBottom: '1px solid var(--color-border)'}}>
      <div className="flex items-start gap-3">
        <Avatar author={reply.author} size={32}/>

        <div className="flex-1 min-w-0">
          {/* 작성자 + 날짜 */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>
              {reply.author.nickname}
            </span>
            <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>
              {formatDate(reply.createdAt)}
            </span>
          </div>

          {/* 댓글 내용 */}
          <p className="text-sm leading-relaxed" style={{color: 'var(--color-text-main)'}}>
            {reply.replyContent}
          </p>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3 mt-2">
            {/* 좋아요 */}
            <button
              onClick={() => onLike(reply.replyId)}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{color: reply.isLiked ? 'var(--color-accent)' : 'var(--color-text-hint)'}}
            >
              <ThumbsUp size={12}/>
              {reply.likeCount > 0 && <span>{reply.likeCount}</span>}
            </button>

            {/* 답글 달기 */}
            <button
              onClick={() => onReplyTo(reply.replyId, reply.author.nickname)}
              className="text-xs transition-colors"
              style={{color: isReplying ? 'var(--color-accent)' : 'var(--color-text-hint)'}}
            >
              답글 달기
            </button>
          </div>
        </div>

        {/* 내 댓글인 경우 삭제 버튼 */}
        {reply.author.memberId === myMemberId && (
          <button
            onClick={() => {
              if (confirm('댓글을 삭제하시겠습니까?')) onDelete(reply.replyId)
            }}
            style={{color: 'var(--color-text-hint)'}}
            aria-label="댓글 삭제"
          >
            <MoreHorizontal size={16}/>
          </button>
        )}
      </div>

      {/* 대댓글 목록 */}
      {reply.children.length > 0 && (
        <div
          className="mt-1 rounded-xl"
          style={{background: 'var(--color-surface-sunken)'}}
        >
          {reply.children.map(child => (
            <ChildReplyItem key={child.replyId} reply={child} onLike={onLike}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────
export default function CommunityDetailPage() {
  const {id} = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const commId = Number(id)

  /* 현재 로그인 유저 ID (본인 댓글 삭제 버튼 표시용) */
  const myMemberId = useAuthStore(s => s.user?.id ?? null)

  // ── 게시글 상세 조회 ─────────────────────────────────────────────────────
  const {
    data: post,
    isLoading: postLoading,
    isError: postError,
  } = useQuery({
    queryKey: ['communityPost', commId],
    queryFn: () => getCommunityPostDetail(commId),
    enabled: !!commId,
    staleTime: 30_000,
  })

  // ── 댓글 목록 조회 ─────────────────────────────────────────────────────
  const {data: replies = []} = useQuery({
    queryKey: ['communityReplies', commId],
    queryFn: () => getReplies(commId),
    enabled: !!commId,
    staleTime: 15_000,
  })

  // ── 로컬 상태 ───────────────────────────────────────────────────────────
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: number; nickname: string } | null>(null)
  const [localLiked, setLocalLiked] = useState<boolean | null>(null)   // null = 서버값 사용
  const [localLikeCount, setLocalLikeCount] = useState<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── 댓글 작성 mutation ──────────────────────────────────────────────────
  const {mutate: submitReply, isPending: isSubmittingReply} = useMutation({
    mutationFn: (req: ReplyRequest) => createReply(commId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['communityReplies', commId]})
      queryClient.invalidateQueries({queryKey: ['communityPost', commId]})
      setReplyText('')
      setReplyingTo(null)
    },
  })

  // ── 댓글 삭제 mutation ──────────────────────────────────────────────────
  const {mutate: removeReply} = useMutation({
    mutationFn: (replyId: number) => deleteReply(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['communityReplies', commId]})
      queryClient.invalidateQueries({queryKey: ['communityPost', commId]})
    },
  })

  // ── 게시글 좋아요 ───────────────────────────────────────────────────────
  async function handlePostLike() {
    if (!post) return
    const prevLiked = localLiked ?? post.isLiked
    const prevCount = localLikeCount ?? post.likeCount
    /* 낙관적 업데이트 */
    setLocalLiked(!prevLiked)
    setLocalLikeCount(prevLiked ? prevCount - 1 : prevCount + 1)
    try {
      const newCount = await togglePostLike(commId)
      setLocalLikeCount(newCount)
    } catch {
      /* 실패 시 롤백 */
      setLocalLiked(prevLiked)
      setLocalLikeCount(prevCount)
    }
  }

  // ── 댓글 좋아요 ────────────────────────────────────────────────────────
  async function handleReplyLike(replyId: number) {
    try {
      await toggleReplyLike(replyId)
      queryClient.invalidateQueries({queryKey: ['communityReplies', commId]})
    } catch {
      /* 실패 무시 */
    }
  }

  // ── 답글 달기 클릭 ─────────────────────────────────────────────────────
  function handleReplyTo(replyId: number, nickname: string) {
    if (replyingTo?.id === replyId) {
      setReplyingTo(null);
      return
    }
    setReplyingTo({id: replyId, nickname})
    inputRef.current?.focus()
  }

  // ── 댓글 제출 ──────────────────────────────────────────────────────────
  function handleSubmitReply() {
    if (!replyText.trim() || isSubmittingReply) return
    submitReply({
      replyContent: replyText.trim(),
      parentId: replyingTo?.id,
    })
  }

  /* 로딩 / 에러 처리 */
  if (postLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
      </div>
    )
  }
  if (postError || !post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <AlertCircle size={28} color="var(--color-error)"/>
        <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>게시글을 찾을 수 없습니다.</p>
      </div>
    )
  }

  /* 좋아요 표시값: 낙관적 로컬값 우선, 없으면 서버값 */
  const displayLiked = localLiked ?? post.isLiked
  const displayLikeCount = localLikeCount ?? post.likeCount

  const sportLabel = SPORT_LABEL[post.sport as keyof typeof SPORT_LABEL] ?? post.sport

  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      {reportModalOpen && (
        <ReportModal
          targetType="COMMUNITY_POST"
          targetId={post.commId}
          onClose={() => setReportModalOpen(false)}
        />
      )}
      <div className="max-w-[800px] mx-auto px-4 md:px-7 py-6 md:py-10">

        {/* 뒤로가기 */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/community')}
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-[var(--color-accent)]"
            style={{color: 'var(--color-text-sub)'}}
          >
            <ChevronLeft size={16}/>
            커뮤니티
          </button>
        </div>

        {/* 게시글 카드 */}
        <article
          className="rounded-2xl overflow-hidden mb-6"
          style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
        >
          {/* 게시글 헤더 */}
          <div className="p-5 md:p-6">
            {/* 종목 + 구단 태그 */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  background: 'var(--color-surface-raised)',
                  color: 'var(--color-accent)',
                  border: '1px solid var(--color-border)'
                }}
              >
                {sportLabel}
              </span>
              {post.teamCategory && (
                <span
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{
                    background: 'var(--color-surface-raised)',
                    color: 'var(--color-text-sub)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  {post.teamCategory}
                </span>
              )}
            </div>

            {/* 제목 */}
            <h1 className="text-xl font-bold mb-4 leading-snug"
                style={{color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif"}}>
              {post.commTitle}
            </h1>

            {/* 작성자 + 메타 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar author={post.author} size={34}/>
                <div>
                  <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>
                    {post.author.nickname}
                  </p>
                  <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
                    {formatDate(post.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs" style={{color: 'var(--color-text-hint)'}}>
                <span className="flex items-center gap-1">
                  <Eye size={12}/>
                  {post.commViewCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={12}/>
                  {post.commentCount}
                </span>
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center gap-1 transition-colors hover:text-[var(--color-accent)]"
                  aria-label="신고"
                >
                  <Flag size={11}/>
                  신고
                </button>
              </div>
            </div>
          </div>

          {/* 본문 */}
          <div
            className="px-5 md:px-6 pb-5"
            style={{borderTop: '1px solid var(--color-border)'}}
          >
            <p
              className="pt-5 text-sm leading-loose whitespace-pre-wrap"
              style={{color: 'var(--color-text-main)'}}
            >
              {post.commContent}
            </p>

            {/* 첨부 이미지 */}
            {post.commImageUrl && (
              <img
                src={post.commImageUrl}
                alt="첨부 이미지"
                className="mt-4 rounded-xl w-full object-cover max-h-[400px]"
              />
            )}
          </div>

          {/* 게시글 좋아요 버튼 */}
          <div
            className="px-5 md:px-6 py-4 flex items-center justify-center"
            style={{borderTop: '1px solid var(--color-border)'}}
          >
            <button
              onClick={handlePostLike}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all"
              style={{
                background: displayLiked ? 'rgba(255,46,77,.1)' : 'var(--color-surface-raised)',
                color: displayLiked ? 'var(--color-accent)' : 'var(--color-text-sub)',
                border: `1px solid ${displayLiked ? 'rgba(255,46,77,.3)' : 'var(--color-border)'}`,
              }}
            >
              <ThumbsUp size={15}/>
              좋아요 {displayLikeCount}
            </button>
          </div>
        </article>

        {/* 댓글 섹션 */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
        >
          {/* 댓글 헤더 */}
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{borderBottom: '1px solid var(--color-border)'}}
          >
            <MessageSquare size={16} style={{color: 'var(--color-text-sub)'}}/>
            <h2 className="font-bold text-sm"
                style={{color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif"}}>
              댓글 {post.commentCount}
            </h2>
          </div>

          {/* 댓글 목록 */}
          <div className="px-5">
            {replies.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>첫 번째 댓글을 남겨보세요!</p>
              </div>
            ) : (
              replies.map(reply => (
                <TopReplyItem
                  key={reply.replyId}
                  reply={reply}
                  onLike={handleReplyLike}
                  onReplyTo={handleReplyTo}
                  onDelete={(rid) => removeReply(rid)}
                  replyingToId={replyingTo?.id ?? null}
                />
              ))
            )}
          </div>

          {/* 댓글 입력 폼 */}
          <div
            className="px-5 py-4"
            style={{borderTop: '1px solid var(--color-border)'}}
          >
            {/* 답글 대상 표시 */}
            {replyingTo && (
              <div
                className="flex items-center justify-between px-3 py-2 rounded-xl mb-2"
                style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
              >
                <span className="text-xs" style={{color: 'var(--color-accent)'}}>
                  <CornerDownRight size={12} className="inline mr-1"/>
                  <strong>{replyingTo.nickname}</strong>님에게 답글 작성 중
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-xs"
                  style={{color: 'var(--color-text-hint)'}}
                >
                  취소
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <Avatar author={{memberId: myMemberId ?? 0, nickname: '나'}} size={30}/>
              <textarea
                ref={inputRef}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitReply()
                  }
                }}
                placeholder={replyingTo ? `${replyingTo.nickname}님에게 답글...` : '댓글을 입력하세요...'}
                rows={2}
                className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm outline-none leading-relaxed"
                style={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-main)',
                }}
              />
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || isSubmittingReply}
                className="p-2.5 rounded-xl flex-shrink-0 disabled:opacity-40"
                style={{background: 'var(--color-accent)', color: '#fff'}}
              >
                {/* 전송 중에는 Loader2 스피너, 대기 중에는 Send 아이콘 */}
                {isSubmittingReply ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
