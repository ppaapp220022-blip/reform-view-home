# Draft API Guide

## 개요
게시글과 댓글 작성 중인 텍스트를 Redis에 자동 저장하고, 다시 로그인했을 때 복원하는 기능입니다.

현재 백엔드는 JWT 작업 전이라 `Authorization` 헤더 대신 `X-Member-Id` 헤더를 사용합니다.

## 백엔드 API 경로

### 게시글 초안
- `PATCH /api/drafts/posts`
- `GET /api/drafts/posts`
- `DELETE /api/drafts/posts`

요청/응답 DTO

```ts
type PostDraftDTO = {
  title: string;
  content: string;
};
```

### 댓글 초안
- `PATCH /api/drafts/replies`
- `GET /api/drafts/replies?targetType=...&targetId=...`
- `DELETE /api/drafts/replies?targetType=...&targetId=...`

요청/응답 DTO

```ts
type ReplyDraftDTO = {
  targetType: string;
  targetId: number;
  content: string;
};
```

## 프론트 파일 구성
- `draftTypes.ts`: DTO 타입 정의
- `draftApi.ts`: fetch 기반 API 함수
- `useDraftAutosave.ts`: 자동 저장 훅

## 권장 사용 흐름
1. 페이지 진입 시 초안 조회 API를 호출합니다.
2. 입력 값이 바뀔 때 800ms debounce 후 자동 저장합니다.
3. 실제 게시글/댓글 등록이 성공하면 초안 삭제 API를 호출합니다.

## 게시글 자동 저장 예시

```ts
const [draft, setDraft] = useState<PostDraftDTO>({
  title: "",
  content: "",
});

usePostDraftAutosave(memberId, draft, (savedDraft) => {
  setDraft(savedDraft);
});
```

## 댓글 자동 저장 예시

```ts
const [replyDraft, setReplyDraft] = useState<ReplyDraftDTO>({
  targetType: "POST",
  targetId: 12,
  content: "",
});

useReplyDraftAutosave(memberId, replyDraft, (savedDraft) => {
  setReplyDraft(savedDraft);
});
```

## 등록 성공 후 초안 삭제 예시

```ts
await createPost(draft);
await removePostDraft(memberId);
```

```ts
await createReply(replyDraft);
await removeReplyDraft(memberId, replyDraft.targetType, replyDraft.targetId);
```

## 주의할 점
- `targetType` 값은 백엔드가 기대하는 문자열과 맞춰야 합니다.
- 초안은 회원 기준으로 저장되므로 비로그인 상태에서는 별도 정책이 필요합니다.
- JWT가 붙으면 `X-Member-Id` 헤더는 제거하고 인증 토큰 방식으로 바꾸면 됩니다.
