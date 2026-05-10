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
import { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ThumbsUp, MessageSquare, Eye,
  CornerDownRight, Trash2, Send, MoreHorizontal,
} from 'lucide-react'
import type { Sport } from '../../types/listing'
import type { ReplyItem, AuthorBrief, CommunityPostDetail } from '../../types/community'
import ReportModal from '../../components/ui/ReportModal'

// ── 상수: 종목 레이블 ─────────────────────────────────────────────────────────
const SPORT_LABEL: Record<Sport | 'ETC', string> = {
  SOCCER: '축구', BASEBALL: '야구', BASKETBALL: '농구',
  VOLLEYBALL: '배구', ESPORTS: 'e스포츠', ETC: '기타',
}

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

const MY_ID = 1 // 임시 — 추후 authStore에서 가져오기

const MOCK_POST: CommunityPostDetail = {
  commId: 1,
  sportCategory: 'SOCCER',
  teamCategory: '맨체스터 유나이티드',
  commTitle: '맨유 레트로 유니폼 세탁 어떻게 하시나요?',
  commContent: `안녕하세요! 맨유 98-99 트레블 시즌 레트로 유니폼을 최근 구매했는데요.

오래된 유니폼이라서 세탁 방법이 걱정됩니다. 혹시 레트로 유니폼 세탁 경험 있으신 분들 계신가요?

인터넷에는 손세탁 권장이라고 나와 있는데, 마킹 부분이 오래될수록 약해질 것 같아서요.
특히 선수 이름 마킹이 벗겨질까봐 걱정이에요.

경험 공유 부탁드립니다!`,
  commImageUrl: undefined,
  commViewCount: 128,
  likeCount: 24,
  commentCount: 5,
  isLiked: false,
  status: 'ACTIVE',
  author: { memberId: 42, nickname: 'uniform_king', profileImageUrl: undefined },
  createdAt: '2026-05-09T14:30:00',
}

const MOCK_REPLIES: ReplyItem[] = [
  {
    replyId: 1,
    author: { memberId: 77, nickname: 'retro_collector' },
    replyContent: '레트로 유니폼은 무조건 손세탁 추천드립니다! 30도 이하 미지근한 물에 중성 세제로 살살 빨면 마킹 오래가더라고요.',
    likeCount: 8,
    isLiked: false,
    isDeleted: false,
    createdAt: '2026-05-09T15:00:00',
    children: [
      {
        replyId: 3,
        author: { memberId: 42, nickname: 'uniform_king' },
        replyContent: '감사합니다! 중성 세제는 울샴푸 같은 걸 쓰면 될까요?',
        likeCount: 2,
        isLiked: false,
        isDeleted: false,
        createdAt: '2026-05-09T15:30:00',
        children: [],
      },
      {
        replyId: 4,
        author: { memberId: 77, nickname: 'retro_collector' },
        replyContent: '네! 울샴푸 또는 중성 주방세제 소량도 괜찮아요.',
        likeCount: 3,
        isLiked: false,
        isDeleted: false,
        createdAt: '2026-05-09T15:45:00',
        children: [],
      },
    ],
  },
  {
    replyId: 2,
    author: { memberId: 55, nickname: 'kit_master' },
    replyContent: '마킹 보호를 위해 세탁 전 뒤집어서 세탁망에 넣으세요. 건조는 그늘 자연건조!',
    likeCount: 12,
    isLiked: true,
    isDeleted: false,
    createdAt: '2026-05-09T16:00:00',
    children: [],
  },
  {
    replyId: 5,
    author: { memberId: 99, nickname: 'deleted_user' },
    replyContent: '',
    likeCount: 0,
    isLiked: false,
    isDeleted: true,
    createdAt: '2026-05-09T17:00:00',
    children: [],
  },
]

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── 서브 컴포넌트: 아바타 ─────────────────────────────────────────────────────
function Avatar({ author, size = 32 }: { author: AuthorBrief; size?: number }) {
  if (author.profileImageUrl) {
    return (
      <img
        src={author.profileImageUrl}
        alt={author.nickname}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  // 이니셜 아바타
  const colors = ['#002147', '#343F5B', '#1A3051', '#5A6A7A']
  const color = colors[author.memberId % colors.length]
  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
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
        <CornerDownRight size={14} style={{ color: 'var(--color-border)', flexShrink: 0, marginTop: 2 }} />
        <p className="text-xs italic" style={{ color: 'var(--color-text-hint)' }}>삭제된 댓글입니다.</p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 pl-8 py-2.5">
      {/* 들여쓰기 화살표 */}
      <CornerDownRight size={14} style={{ color: 'var(--color-border)', flexShrink: 0, marginTop: 6 }} />

      <Avatar author={reply.author} size={26} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-main)' }}>
            {reply.author.nickname}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-hint)' }}>
            {formatDate(reply.createdAt)}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-main)' }}>
          {reply.replyContent}
        </p>
        {/* 대댓글 좋아요 */}
        <button
          onClick={() => onLike(reply.replyId)}
          className="flex items-center gap-1 mt-1.5 text-xs transition-colors"
          style={{ color: reply.isLiked ? 'var(--color-accent)' : 'var(--color-text-hint)' }}
        >
          <ThumbsUp size={11} />
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
  replyingToId,
}: {
  reply: ReplyItem
  onLike: (replyId: number) => void
  onReplyTo: (replyId: number, nickname: string) => void
  replyingToId: number | null
}) {
  const isReplying = replyingToId === reply.replyId

  if (reply.isDeleted) {
    return (
      <div className="py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p className="text-sm italic" style={{ color: 'var(--color-text-hint)' }}>삭제된 댓글입니다.</p>
        {/* 삭제된 댓글의 대댓글은 그대로 표시 */}
        {reply.children.map(child => (
          <ChildReplyItem key={child.replyId} reply={child} onLike={onLike} />
        ))}
      </div>
    )
  }

  return (
    <div className="py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-start gap-3">
        <Avatar author={reply.author} size={32} />

        <div className="flex-1 min-w-0">
          {/* 작성자 + 날짜 */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-main)' }}>
              {reply.author.nickname}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
              {formatDate(reply.createdAt)}
            </span>
          </div>

          {/* 댓글 내용 */}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-main)' }}>
            {reply.replyContent}
          </p>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3 mt-2">
            {/* 좋아요 */}
            <button
              onClick={() => onLike(reply.replyId)}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: reply.isLiked ? 'var(--color-accent)' : 'var(--color-text-hint)' }}
            >
              <ThumbsUp size={12} />
              {reply.likeCount > 0 && <span>{reply.likeCount}</span>}
            </button>

            {/* 답글 달기 */}
            <button
              onClick={() => onReplyTo(reply.replyId, reply.author.nickname)}
              className="text-xs transition-colors"
              style={{ color: isReplying ? 'var(--color-accent)' : 'var(--color-text-hint)' }}
            >
              답글 달기
            </button>
          </div>
        </div>

        {/* 내 댓글인 경우 삭제 버튼 */}
        {reply.author.memberId === MY_ID && (
          <button style={{ color: 'var(--color-text-hint)' }}>
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>

      {/* 대댓글 목록 */}
      {reply.children.length > 0 && (
        <div
          className="mt-1 rounded-xl"
          style={{ background: 'var(--color-surface-sunken)' }}
        >
          {reply.children.map(child => (
            <ChildReplyItem key={child.replyId} reply={child} onLike={onLike} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────
export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // 목 데이터 (추후 useQuery로 교체)
  const [post, setPost] = useState<CommunityPostDetail>(MOCK_POST)
  const [replies, setReplies] = useState<ReplyItem[]>(MOCK_REPLIES)

  // 댓글 입력 상태
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: number; nickname: string } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── 게시글 좋아요 ───────────────────────────────────────────────────────────
  function handlePostLike() {
    setPost(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
    }))
    // 추후 togglePostLike(post.commId) API 호출
  }

  // ── 댓글 좋아요 ────────────────────────────────────────────────────────────
  function handleReplyLike(replyId: number) {
    function toggleInList(list: ReplyItem[]): ReplyItem[] {
      return list.map(r => {
        if (r.replyId === replyId) {
          return { ...r, isLiked: !r.isLiked, likeCount: r.isLiked ? r.likeCount - 1 : r.likeCount + 1 }
        }
        if (r.children.length > 0) {
          return { ...r, children: toggleInList(r.children) }
        }
        return r
      })
    }
    setReplies(prev => toggleInList(prev))
    // 추후 toggleReplyLike(post.commId, replyId) API 호출
  }

  // ── 답글 달기 버튼 클릭 ────────────────────────────────────────────────────
  function handleReplyTo(replyId: number, nickname: string) {
    // 같은 댓글 재클릭 시 취소
    if (replyingTo?.id === replyId) {
      setReplyingTo(null)
      return
    }
    setReplyingTo({ id: replyId, nickname })
    inputRef.current?.focus()
  }

  // ── 댓글 제출 ───────────────────────────────────────────────────────────────
  function handleSubmitReply() {
    if (!replyText.trim()) return

    const newReply: ReplyItem = {
      replyId: Date.now(), // 임시 ID (서버 응답 후 교체)
      author: { memberId: MY_ID, nickname: '나' },
      replyContent: replyText.trim(),
      likeCount: 0,
      isLiked: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      children: [],
    }

    if (replyingTo) {
      // 대댓글: 해당 부모 댓글의 children에 추가
      setReplies(prev =>
        prev.map(r =>
          r.replyId === replyingTo.id
            ? { ...r, children: [...r.children, newReply] }
            : r,
        ),
      )
      setReplyingTo(null)
    } else {
      // 최상위 댓글 추가
      setReplies(prev => [...prev, newReply])
    }

    setPost(prev => ({ ...prev, commentCount: prev.commentCount + 1 }))
    setReplyText('')
    // 추후 createReply(post.commId, { replyContent, parentId }) API 호출
  }

  const sportLabel = SPORT_LABEL[post.sportCategory as keyof typeof SPORT_LABEL] ?? post.sportCategory

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
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
            style={{ color: 'var(--color-text-sub)' }}
          >
            <ChevronLeft size={16} />
            커뮤니티
          </button>
        </div>

        {/* 게시글 카드 */}
        <article
          className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {/* 게시글 헤더 */}
          <div className="p-5 md:p-6">
            {/* 종목 + 구단 태그 */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: 'var(--color-surface-raised)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
              >
                {sportLabel}
              </span>
              {post.teamCategory && (
                <span
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-sub)', border: '1px solid var(--color-border)' }}
                >
                  {post.teamCategory}
                </span>
              )}
            </div>

            {/* 제목 */}
            <h1 className="text-xl font-bold mb-4 leading-snug" style={{ color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif" }}>
              {post.commTitle}
            </h1>

            {/* 작성자 + 메타 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar author={post.author} size={34} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-main)' }}>
                    {post.author.nickname}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
                    {formatDate(post.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-hint)' }}>
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  {post.commViewCount}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={12} />
                  {post.commentCount}
                </span>
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center gap-1 transition-colors hover:text-[var(--color-accent)]"
                  aria-label="신고"
                >
                  <Flag size={11} />
                  신고
                </button>
              </div>
            </div>
          </div>

          {/* 본문 */}
          <div
            className="px-5 md:px-6 pb-5"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <p
              className="pt-5 text-sm leading-loose whitespace-pre-wrap"
              style={{ color: 'var(--color-text-main)' }}
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
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <button
              onClick={handlePostLike}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all"
              style={{
                background: post.isLiked ? 'rgba(255,46,77,.1)' : 'var(--color-surface-raised)',
                color: post.isLiked ? 'var(--color-accent)' : 'var(--color-text-sub)',
                border: `1px solid ${post.isLiked ? 'rgba(255,46,77,.3)' : 'var(--color-border)'}`,
              }}
            >
              <ThumbsUp size={15} />
              좋아요 {post.likeCount}
            </button>
          </div>
        </article>

        {/* 댓글 섹션 */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {/* 댓글 헤더 */}
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <MessageSquare size={16} style={{ color: 'var(--color-text-sub)' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif" }}>
              댓글 {post.commentCount}
            </h2>
          </div>

          {/* 댓글 목록 */}
          <div className="px-5">
            {replies.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>첫 번째 댓글을 남겨보세요!</p>
              </div>
            ) : (
              replies.map(reply => (
                <TopReplyItem
                  key={reply.replyId}
                  reply={reply}
                  onLike={handleReplyLike}
                  onReplyTo={handleReplyTo}
                  replyingToId={replyingTo?.id ?? null}
                />
              ))
            )}
          </div>

          {/* 댓글 입력 폼 */}
          <div
            className="px-5 py-4"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            {/* 답글 대상 표시 */}
            {replyingTo && (
              <div
                className="flex items-center justify-between px-3 py-2 rounded-xl mb-2"
                style={{ background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)' }}
              >
                <span className="text-xs" style={{ color: 'var(--color-accent)' }}>
                  <CornerDownRight size={12} className="inline mr-1" />
                  <strong>{replyingTo.nickname}</strong>님에게 답글 작성 중
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-xs"
                  style={{ color: 'var(--color-text-hint)' }}
                >
                  취소
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <Avatar author={{ memberId: MY_ID, nickname: '나' }} size={30} />
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
                disabled={!replyText.trim()}
                className="p-2.5 rounded-xl flex-shrink-0 disabled:opacity-40"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
