import type {ApiResponse, PostDraftDTO, ReplyDraftDTO} from "./draftTypes";

const API_BASE = "/api/drafts";

// JWT 작업 전까지 임시로 회원 ID 헤더를 사용한다.
const memberHeaders = (memberId: number, json = false) => ({
  ...(json ? {"Content-Type": "application/json"} : {}),
  "X-Member-Id": String(memberId),
});

// 게시글 초안을 저장한다.
export async function savePostDraft(memberId: number, draft: PostDraftDTO) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "PATCH",
    headers: memberHeaders(memberId, true),
    body: JSON.stringify(draft),
  });

  if (!res.ok) {
    throw new Error("게시글 초안 저장 실패");
  }

  return (await res.json()) as ApiResponse<null>;
}

// 게시글 초안을 조회한다.
export async function getPostDraft(memberId: number) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "GET",
    headers: memberHeaders(memberId),
  });

  if (!res.ok) {
    throw new Error("게시글 초안 조회 실패");
  }

  return (await res.json()) as ApiResponse<PostDraftDTO | null>;
}

// 게시글 초안을 삭제한다.
export async function removePostDraft(memberId: number) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "DELETE",
    headers: memberHeaders(memberId),
  });

  if (!res.ok) {
    throw new Error("게시글 초안 삭제 실패");
  }

  return (await res.json()) as ApiResponse<null>;
}

// 댓글 초안을 저장한다.
export async function saveReplyDraft(memberId: number, draft: ReplyDraftDTO) {
  const res = await fetch(`${API_BASE}/replies`, {
    method: "PATCH",
    headers: memberHeaders(memberId, true),
    body: JSON.stringify(draft),
  });

  if (!res.ok) {
    throw new Error("댓글 초안 저장 실패");
  }

  return (await res.json()) as ApiResponse<null>;
}

// 댓글 초안을 조회한다.
export async function getReplyDraft(
  memberId: number,
  targetType: string,
  targetId: number
) {
  const query = new URLSearchParams({
    targetType,
    targetId: String(targetId),
  });

  const res = await fetch(`${API_BASE}/replies?${query.toString()}`, {
    method: "GET",
    headers: memberHeaders(memberId),
  });

  if (!res.ok) {
    throw new Error("댓글 초안 조회 실패");
  }

  return (await res.json()) as ApiResponse<ReplyDraftDTO | null>;
}

// 댓글 초안을 삭제한다.
export async function removeReplyDraft(
  memberId: number,
  targetType: string,
  targetId: number
) {
  const query = new URLSearchParams({
    targetType,
    targetId: String(targetId),
  });

  const res = await fetch(`${API_BASE}/replies?${query.toString()}`, {
    method: "DELETE",
    headers: memberHeaders(memberId),
  });

  if (!res.ok) {
    throw new Error("댓글 초안 삭제 실패");
  }

  return (await res.json()) as ApiResponse<null>;
}
