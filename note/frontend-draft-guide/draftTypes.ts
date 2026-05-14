// 게시글 작성 초안 DTO
export type PostDraftDTO = {
  // 게시글 제목
  title: string;
  // 게시글 본문
  content: string;
};

// 댓글 작성 초안 DTO
export type ReplyDraftDTO = {
  // 댓글이 달리는 대상 종류
  targetType: string;
  // 댓글이 달리는 대상 ID
  targetId: number;
  // 댓글 본문
  content: string;
};

// 백엔드 공통 응답 DTO
export type ApiResponse<T> = {
  data: T;
  message: string;
};
