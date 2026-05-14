# RE:FORM Backend API Handoff

기준일: `2026-05-14`

이 문서는 현재 백엔드 코드 기준으로 프론트엔드가 바로 연동할 수 있도록 정리한 API 명세서다.  
기준 소스는 `src/main/java/com/re_form_shop_2605/controller/**`, `dto/**`, `config/SecurityConfig.java` 이다.

## 1. 기본 규칙

- Base URL: `http://localhost:8080`
- 인증 방식: `Authorization: Bearer {accessToken}`
- 업로드 정적 경로: `/uploads/**`
- 페이지 요청은 대부분 `page=0`부터 시작
- `PageResponse.number`는 코드 주석상 `1부터`라고 되어 있어 프론트에서 실제 응답값 확인 권장

## 2. 공통 응답 형태

대부분의 API는 아래 래퍼를 사용한다.

```json
{
  "success": true,
  "message": "처리 완료 메시지",
  "data": {}
}
```

검증 실패/일반 오류는 보통 아래 형태다.

```json
{
  "success": false,
  "message": "유효성 검사에 실패했습니다.",
  "data": {
    "fieldName": "NotBlank"
  }
}
```

예외적으로 아래 도메인은 `ApiResponse` 래퍼 없이 raw DTO를 바로 반환한다.

- `PaymentController`
- `PointController`
- `ChatRestController`
- `AdminWithdrawController`
- `AuthController`의 `logout`, `logout/session`, `logout/all`은 `204 No Content`

페이지 응답 공통 구조:

```json
{
  "content": [],
  "totalElements": 0,
  "totalPages": 0,
  "size": 10,
  "number": 0,
  "first": true,
  "last": true
}
```

## 3. 인증 / 회원

### 3-1. 인증 API

| Method | URL                                  | Auth | 요청                                                                              | 응답                                           |
|--------|--------------------------------------|------|---------------------------------------------------------------------------------|----------------------------------------------|
| `POST` | `/api/auth/login`                    | N    | `email`, `password`                                                             | `ApiResponse<LoginChallengeResponseDTO>`     |
| `POST` | `/api/auth/login/verify`             | N    | `challengeId`, `code(6자리)`                                                      | `ApiResponse<LoginResponseDTO>`              |
| `POST` | `/api/auth/register`                 | N    | `email`, `password`, `nickname`, `agreeTerms`, `agreePrivacy`, `agreeMarketing` | `201`, `ApiResponse<MemberResponseDTO>`      |
| `GET`  | `/api/auth/check-nickname?nickname=` | N    | query string                                                                    | `ApiResponse<{ available }>`                 |
| `GET`  | `/api/auth/me`                       | Y    | -                                                                               | `ApiResponse<AuthUserDTO>`                   |
| `GET`  | `/api/auth/sessions`                 | Y    | 헤더의 access token 기준 현재 세션 포함 목록                                                 | `ApiResponse<AuthSessionResponseDTO[]>`      |
| `POST` | `/api/auth/logout`                   | Y    | `refreshToken`                                                                  | `204`                                        |
| `POST` | `/api/auth/logout/session`           | Y    | `sessionId`                                                                     | `204`                                        |
| `POST` | `/api/auth/logout/all`               | Y    | -                                                                               | `204`                                        |
| `POST` | `/api/auth/password/reset`           | N    | `email`, `nickname`, `newPassword`                                              | `ApiResponse<null>`                          |
| `POST` | `/api/auth/token/refresh`            | N    | `refreshToken`                                                                  | `ApiResponse<{ accessToken, refreshToken }>` |
| `GET`  | `/api/auth/oauth2/kakao`             | N    | -                                                                               | `302` redirect                               |
| `GET`  | `/api/auth/oauth2/google`            | N    | -                                                                               | `302` redirect                               |

주요 DTO:

- `LoginChallengeResponseDTO`
    - `challengeId`
    - `email`
    - `expiresInSeconds`
- `LoginResponseDTO`, `MemberResponseDTO`
    - `accessToken`
    - `refreshToken`
    - `user`
- `AuthUserDTO.user`
    - `id`
    - `email`
    - `nickname`
    - `profileImageUrl`
    - `role`
    - `mannerScore`
- `AuthSessionResponseDTO`
    - `sessionId`
    - `loginType`
    - `provider`
    - `issuedAt`
    - `expiresAt`
    - `current`

주의:

- 로그인은 2단계다. `login` 후 `login/verify`를 한 번 더 호출해야 토큰이 발급된다.
- 토큰 재발급은 예전 문서와 달리 현재 `refreshToken`도 함께 반환한다.
- OAuth 콜백 공개 API는 없고 스프링 시큐리티 콜백 `/login/oauth2/code/{provider}`를 사용한다.

### 3-2. 마이페이지 API

| Method  | URL                                 | Auth | 요청                                      | 응답                                             |
|---------|-------------------------------------|------|-----------------------------------------|------------------------------------------------|
| `GET`   | `/api/users/me`                     | Y    | -                                       | `ApiResponse<ProfileResponseDTO>`              |
| `PATCH` | `/api/users/me`                     | Y    | `nickname?`, `profileImageUrl?`, `bio?` | `ApiResponse<ProfileResponseDTO>`              |
| `POST`  | `/api/users/me/profile-image`       | Y    | `multipart/form-data`, `profileImage`   | `201`, `ApiResponse<{ profileImageUrl }>`      |
| `POST`  | `/api/users/me/interest-setting`    | Y    | `sport`, `team`, `keywords[]`           | `ApiResponse<null>`                            |
| `GET`   | `/api/users/me/interest-setting`    | Y    | -                                       | `ApiResponse<OnboardingResponseDTO>`           |
| `GET`   | `/api/users/me/reviews?page=&size=` | Y    | -                                       | `ApiResponse<PageResponse<ReviewResponseDTO>>` |

주요 DTO:

- `ProfileResponseDTO`
    - `memberId`, `email`, `nickname`, `profileImageUrl`, `bio`
    - `mannerScore`, `role`, `status`
    - `pointBalance`, `pointWithdrawable`, `pointPending`
    - `totalSales`, `totalPurchases`
    - `interest`
    - `createdAt`
- `OnboardingRequestDTO`
    - `sport`
    - `team`
    - `keywords[]`

## 4. 판매글 / 거래

### 4-1. 판매글 API

| Method   | URL                       | Auth | 요청                                                                                                             | 응답                                       |
|----------|---------------------------|------|----------------------------------------------------------------------------------------------------------------|------------------------------------------|
| `GET`    | `/api/listings`           | 선택   | `sport?`, `keyword?`, `tradeType?`, `condition?`, `minPrice?`, `maxPrice?`, `sort=latest`, `page=0`, `size=10` | `ApiResponse<PageResponse<PostCardDTO>>` |
| `GET`    | `/api/listings/{id}`      | 선택   | path                                                                                                           | `ApiResponse<PostDetailDTO>`             |
| `POST`   | `/api/listings/images`    | Y    | `multipart/form-data`, `images[]`                                                                              | `201`, `ApiResponse<{ urls[] }>`         |
| `POST`   | `/api/listings`           | Y    | `ListingCreateRequestDTO`                                                                                      | `201`, `ApiResponse<{ id }>`             |
| `PATCH`  | `/api/listings/{id}`      | Y    | `ListingUpdateRequestDTO`                                                                                      | `ApiResponse<{ id }>`                    |
| `DELETE` | `/api/listings/{id}`      | Y    | path                                                                                                           | `ApiResponse<null>`                      |
| `POST`   | `/api/listings/{id}/like` | Y    | path                                                                                                           | `ApiResponse<{ isLiked, likeCount }>`    |

`ListingCreateRequestDTO`

```json
{
  "title": "맨유 홈 유니폼",
  "description": "상태 좋아요",
  "price": 90000,
  "condition": "A",
  "sport": "SOCCER",
  "league": "EPL",
  "team": "맨체스터 유나이티드",
  "size": "L",
  "tradeType": "DELIVERY",
  "imageUrls": [
    "/uploads/post/temp/..."
  ]
}
```

`ListingUpdateRequestDTO`

```json
{
  "title": "수정 제목",
  "description": "수정 설명",
  "condition": "S",
  "size": "XL",
  "price": 100000,
  "tradeType": "BOTH",
  "imageUrls": [
    "/uploads/post/temp/..."
  ]
}
```

주요 응답 필드:

- `PostCardDTO`
    - `postId`, `title`, `team`, `sport`, `price`, `grade`, `size`
    - `deliveryType`, `status`, `viewCount`, `wishCount`, `isWished`
    - `thumbnailUrl`, `timeAgo`, `createdAt`, `seller`
- `PostDetailDTO`
    - `postId`, `title`, `content`, `sport`, `team`, `uniformName`
    - `grade`, `size`, `marking`, `price`, `deliveryType`, `status`
    - `riskLevel`, `viewCount`, `wishCount`, `isWished`
    - `imageUrls[]`, `createdAt`, `updatedAt`, `seller`, `tradeId`

주의:

- 이미지 업로드 후 받은 `urls[]`를 다시 `POST/PATCH /api/listings` 본문 `imageUrls`에 넣는 흐름이다.
- `league`는 요청 DTO에는 있지만 현재 도메인 변환에서 실제 저장에는 쓰이지 않는다.

### 4-2. 거래 API

| Method  | URL                         | Auth                        | 요청                                | 응답                                              |
|---------|-----------------------------|-----------------------------|-----------------------------------|-------------------------------------------------|
| `POST`  | `/api/trades`               | Y                           | `{ postId, deliveryType? }`       | `201`, `ApiResponse<{ tradeId, status }>`       |
| `GET`   | `/api/trades/{id}`          | Y                           | path                              | `ApiResponse<TradeResponseDTO>`                 |
| `PATCH` | `/api/trades/{id}/accept`   | Y                           | -                                 | `ApiResponse<{ status }>`                       |
| `PATCH` | `/api/trades/{id}/confirm`  | Y                           | -                                 | `ApiResponse<{ status }>`                       |
| `PATCH` | `/api/trades/{id}/delivery` | Y                           | `{ deliveryAddress }`             | `ApiResponse<{ status }>`                       |
| `PATCH` | `/api/trades/{id}/shipping` | Y                           | `{ courierCode, trackingNumber }` | `ApiResponse<{ status }>`                       |
| `GET`   | `/api/trades/{id}/tracking` | Y                           | path                              | `ApiResponse<DeliveryTrackingTraceResponseDTO>` |
| `POST`  | `/api/trades/{id}/reviews`  | Y                           | `{ score, comment }`              | `201`, `ApiResponse<{ reviewId }>`              |
| `GET`   | `/api/trades/my?role=buyer  | seller&status=&page=&size=` | Y                                 | query                                           | `ApiResponse<PageResponse<TradeResponseDTO>>` |

`TradeResponseDTO`

- `tradeId`
- `post`
- `buyer`
- `seller`
- `status`
- `deliveryType`
- `deliveryAddress`
- `courierCode`
- `courierName`
- `trackingNumber`
- `tradePrice`
- `shippingStartedAt`
- `completedAt`
- `confirmedAt`
- `createdAt`
- `hasReview`

## 5. 결제 / 포인트

### 5-1. 결제 API

이 도메인은 `ApiResponse` 래퍼 없이 raw DTO를 반환한다.

| Method | URL                                 | Auth | 요청                                | 응답                              |
|--------|-------------------------------------|------|-----------------------------------|---------------------------------|
| `POST` | `/api/payments/init`                | Y    | `{ tradeId, payMethod }`          | `201`, `PaymentInitResponseDTO` |
| `POST` | `/api/payments/confirm`             | N    | `{ paymentKey, orderId, amount }` | `PaymentResponseDTO`            |
| `GET`  | `/api/payments/{tradeId}`           | N    | path                              | `PaymentResponseDTO`            |
| `POST` | `/api/payments/{paymentKey}/cancel` | N    | `{ cancelReason, cancelType }`    | `PaymentResponseDTO`            |

주요 DTO:

- `PaymentInitResponseDTO`
    - `tossOrderId`
    - `orderName`
    - `amount`
- `PaymentResponseDTO`
    - `paymentId`
    - `tradeId`
    - `payMethod`
    - `amount`
    - `status`
    - `approvalNo`
    - `paidAt`

주의:

- 시큐리티 설정상 `/api/payments/**`가 공개되어 있지만, `init`은 실제로 로그인 principal을 사용한다.
- 프론트에서는 `init` 호출 시 반드시 access token을 보내는 쪽으로 사용하는 것이 안전하다.

### 5-2. 포인트 / 출금 API

이 도메인도 `ApiResponse` 래퍼 없이 raw DTO를 반환한다.

| Method   | URL                                          | Auth | 요청                                           | 응답                           |
|----------|----------------------------------------------|------|----------------------------------------------|------------------------------|
| `GET`    | `/api/users/me/points`                       | Y    | -                                            | `PointWalletResponseDTO`     |
| `GET`    | `/api/users/me/points/history`               | Y    | -                                            | `PointHistoryItemDTO[]`      |
| `POST`   | `/api/users/me/points/withdraw`              | Y    | `{ requestAmount, bankName, accountNumber }` | `201`, `WithdrawResponseDTO` |
| `GET`    | `/api/users/me/points/withdraw`              | Y    | -                                            | `WithdrawResponseDTO[]`      |
| `DELETE` | `/api/users/me/points/withdraw/{withdrawId}` | Y    | path                                         | `204`                        |

주요 DTO:

- `PointWalletResponseDTO`
    - `balance`
    - `withdrawable`
    - `pending`
- `PointHistoryItemDTO`
    - `pointId`
    - `type`
    - `changeAmount`
    - `balance`
    - `tradeId`
    - `createdAt`
- `WithdrawResponseDTO`
    - `withdrawId`
    - `requestAmount`
    - `bankName`
    - `accountNumber`
    - `status`
    - `createdAt`

## 6. 커뮤니티 / 채팅 / 임시저장

### 6-1. 커뮤니티 API

| Method   | URL                                     | Auth | 요청                                                                    | 응답                                                    |
|----------|-----------------------------------------|------|-----------------------------------------------------------------------|-------------------------------------------------------|
| `GET`    | `/api/community?sport=&page=&size=`     | N    | query                                                                 | `ApiResponse<PageResponse<CommunityPostListItemDTO>>` |
| `GET`    | `/api/community/{commId}`               | 선택   | path                                                                  | `ApiResponse<CommunityPostDetailDTO>`                 |
| `POST`   | `/api/community`                        | Y    | `sport`, `teamCategory?`, `commTitle`, `commContent`, `commImageUrl?` | `201`, `ApiResponse<{ commId }>`                      |
| `PUT`    | `/api/community/{commId}`               | Y    | `commTitle?`, `commContent?`, `commImageUrl?`                         | `ApiResponse<{ commId }>`                             |
| `DELETE` | `/api/community/{commId}`               | Y    | path                                                                  | `ApiResponse<null>`                                   |
| `POST`   | `/api/community/{commId}/like`          | Y    | path                                                                  | `ApiResponse<int>`                                    |
| `GET`    | `/api/community/{commId}/replies`       | 선택   | path                                                                  | `ApiResponse<ReplyResponseDTO[]>`                     |
| `POST`   | `/api/community/{commId}/replies`       | Y    | `replyContent`, `parentId?`                                           | `201`, `ApiResponse<ReplyResponseDTO>`                |
| `DELETE` | `/api/community/replies/{replyId}`      | Y    | path                                                                  | `ApiResponse<null>`                                   |
| `POST`   | `/api/community/replies/{replyId}/like` | Y    | path                                                                  | `ApiResponse<int>`                                    |
| `GET`    | `/api/community/posts/popular?size=10`  | N    | query                                                                 | `ApiResponse<PopularPostDTO[]>`                       |

주요 DTO:

- `CommunityPostListItemDTO`
    - `commId`, `sport`, `teamCategory`, `commTitle`
    - `commViewCount`, `likeCount`, `commentCount`
    - `status`, `author`, `createdAt`
- `CommunityPostDetailDTO`
    - `commId`, `sport`, `teamCategory`, `commTitle`, `commContent`, `commImageUrl`
    - `commViewCount`, `likeCount`, `commentCount`, `isLiked`
    - `status`, `author`, `createdAt`
- `ReplyResponseDTO`
    - `replyId`, `author`, `replyContent`, `likeCount`, `isLiked`, `isDeleted`, `createdAt`
    - `children[]`

주의:

- `GET /api/community/{commId}`와 `GET /api/community/{commId}/replies`는 비로그인 호출도 허용 의도처럼 보이지만, 현재 컨트롤러는
  `principal.getMemberId()`를 직접 호출한다. 비로그인 연동 전 실제 동작 확인이 필요하다.

### 6-2. 채팅 REST API

이 도메인은 `ApiResponse` 래퍼 없이 raw DTO를 반환한다.

| Method | URL                           | Auth | 요청                                         | 응답                     |
|--------|-------------------------------|------|--------------------------------------------|------------------------|
| `POST` | `/api/chats`                  | Y    | `{ postId }`                               | `ChatRoomDetailDTO`    |
| `GET`  | `/api/chats`                  | Y    | -                                          | `ChatRoomSummaryDTO[]` |
| `GET`  | `/api/chats/{chatId}/message` | Y    | Spring `Pageable` (`page`, `size`, `sort`) | `Page<ChatMessageDTO>` |

주요 DTO:

- `ChatRoomSummaryDTO`
    - `chatId`
    - `partner`
    - `lastMessage`
    - `lastMessageAt`
    - `unreadCount`
    - `post`
- `ChatRoomDetailDTO`
    - `chatId`
    - `buyer`
    - `seller`
    - `post`
    - `tradeId`
    - `tradeStatus`
    - `messages`
- `ChatMessageDTO`
    - `messageId`
    - `senderId`
    - `content`
    - `type`
    - `createdAt`
    - `isRead`
    - `moderation`

### 6-3. STOMP / WebSocket

- 연결 endpoint: `/stomp/chat`
- publish prefix: `/pub`
- subscribe prefix: `/sub`
- 메시지 전송: `/pub/chat/message`
- 읽음 처리: `/pub/chat/read`
- 채팅방 구독: `/sub/chat/{chatId}`
- CONNECT 헤더에 `Authorization: Bearer {accessToken}` 필요

메시지 전송 payload:

```json
{
  "chatId": 1,
  "senderId": 10,
  "content": "안녕하세요",
  "type": "TEXT"
}
```

주의:

- 서버는 `Principal`에서 sender를 복원하므로 `senderId`는 프론트 표시용으로만 보고 실제 신뢰 값은 서버 인증 기준이다.

### 6-4. 임시저장 API

| Method   | URL                                         | Auth | 요청                                   | 응답                           |
|----------|---------------------------------------------|------|--------------------------------------|------------------------------|
| `PATCH`  | `/api/drafts/posts`                         | Y    | `{ title?, content? }`               | `ApiResponse<null>`          |
| `GET`    | `/api/drafts/posts`                         | Y    | -                                    | `ApiResponse<PostDraftDTO>`  |
| `DELETE` | `/api/drafts/posts`                         | Y    | -                                    | `ApiResponse<null>`          |
| `PATCH`  | `/api/drafts/replies`                       | Y    | `{ targetType, targetId, content? }` | `ApiResponse<null>`          |
| `GET`    | `/api/drafts/replies?targetType=&targetId=` | Y    | query                                | `ApiResponse<ReplyDraftDTO>` |
| `DELETE` | `/api/drafts/replies?targetType=&targetId=` | Y    | query                                | `ApiResponse<null>`          |

## 7. 알림 / 신고 / 배송조회

### 7-1. 알림 API

| Method  | URL                              | Auth | 요청    | 응답                                      |
|---------|----------------------------------|------|-------|-----------------------------------------|
| `GET`   | `/api/notifications?page=&size=` | Y    | query | `ApiResponse<{ content, unreadCount }>` |
| `PATCH` | `/api/notifications/{id}/read`   | Y    | path  | `ApiResponse<{ id, isRead }>`           |
| `PATCH` | `/api/notifications/read-all`    | Y    | -     | `ApiResponse<{ updatedCount }>`         |

`NotificationDTO`

- `notiId`
- `type`
- `content`
- `linkUrl`
- `isRead`
- `createdAt`

### 7-2. 신고 API

| Method | URL                           | Auth | 요청                                          | 응답                                             |
|--------|-------------------------------|------|---------------------------------------------|------------------------------------------------|
| `POST` | `/api/reports`                | Y    | `{ targetType, targetId, reason, detail? }` | `201`, `ApiResponse<{ reportId }>`             |
| `GET`  | `/api/reports/my?page=&size=` | Y    | query                                       | `ApiResponse<PageResponse<ReportResponseDTO>>` |

`ReportResponseDTO`

- `reportId`
- `targetType`
- `targetId`
- `reason`
- `detail`
- `status`
- `createdAt`

### 7-3. 배송조회 API

| Method | URL                               | Auth | 요청            | 응답                                              |
|--------|-----------------------------------|------|---------------|-------------------------------------------------|
| `GET`  | `/api/delivery/tracking/couriers` | N    | -             | `ApiResponse<DeliveryCourierListResponseDTO>`   |
| `POST` | `/api/delivery/tracking/trace`    | N    | `{ items[] }` | `ApiResponse<DeliveryTrackingTraceResponseDTO>` |

`trace` 요청 예시:

```json
{
  "items": [
    {
      "clientId": "trade-1",
      "courierCode": "kr.cjlogistics",
      "trackingNumber": "1234567890"
    }
  ]
}
```

## 8. 관리자 API

### 8-1. 회원 / 게시글 / 신고

| Method  | URL                                               | Auth  | 요청                    | 응답                                              |
|---------|---------------------------------------------------|-------|-----------------------|-------------------------------------------------|
| `GET`   | `/api/admin/members?keyword=&status=&page=&size=` | Admin | query                 | `ApiResponse<PageResponse<AdminMemberListDTO>>` |
| `GET`   | `/api/admin/members/{id}`                         | Admin | path                  | `ApiResponse<AdminMemberDetailDTO>`             |
| `PATCH` | `/api/admin/members/{id}/action`                  | Admin | `{ action, reason? }` | `ApiResponse<AdminMemberDetailDTO>`             |
| `GET`   | `/api/admin/posts?keyword=&status=&page=&size=`   | Admin | query                 | `ApiResponse<PageResponse<AdminPostListDTO>>`   |
| `GET`   | `/api/admin/posts/{id}`                           | Admin | path                  | `ApiResponse<AdminPostDetailDTO>`               |
| `PATCH` | `/api/admin/posts/{id}/action`                    | Admin | `{ action, reason? }` | `ApiResponse<AdminPostDetailDTO>`               |
| `GET`   | `/api/admin/reports?status=&page=&size=`          | Admin | query                 | `ApiResponse<PageResponse<ReportResponseDTO>>`  |
| `PATCH` | `/api/admin/reports/{id}`                         | Admin | `{ action }`          | `ApiResponse<ReportResponseDTO>`                |

관리자 요청 enum:

- 회원 액션: `WARN`, `SUSPEND`, `WITHDRAW`
- 게시글 액션: `HIDE`, `DELETE`
- 신고 처리 상태: `PENDING`, `NORMAL`, `WARNING`, `DELETED`

### 8-2. 출금 요청 관리

이 도메인은 `ApiResponse` 래퍼 없이 raw DTO를 반환한다.

| Method  | URL                                         | Auth  | 요청                          | 응답                      |
|---------|---------------------------------------------|-------|-----------------------------|-------------------------|
| `GET`   | `/api/admin/withdraw-requests`              | Admin | -                           | `WithdrawResponseDTO[]` |
| `PATCH` | `/api/admin/withdraw-requests/{withdrawId}` | Admin | `{ action, rejectReason? }` | `WithdrawResponseDTO`   |

출금 처리 액션 enum:

- `APPROVED`
- `REJECTED`

## 9. 프론트에서 바로 알고 있으면 좋은 포인트

- 인증 API 대부분은 `ApiResponse` 래퍼를 쓰지만, 결제/포인트/채팅은 raw DTO를 쓴다.
- 로그인은 2단계다. `login`만으로는 토큰이 안 나온다.
- 판매글과 프로필 이미지는 먼저 업로드 API를 호출한 뒤 반환 URL을 본문에 넣는 방식이다.
- 커뮤니티 일부 조회 API는 비로그인 허용 의도와 달리 현재 코드상 `principal` null 안전처리가 부족하다.
- `GET /api/chats/{chatId}/message` 경로는 일반적인 `messages`가 아니라 실제 구현상 단수형 `message`다.
- 결제 API는 현재 보안 설정상 공개되어 있지만, 실사용 시에는 토큰 전송을 유지하는 편이 안전하다.

## 10. 주요 Enum 값

| 분류                   | 값                                                                                                            |
|----------------------|--------------------------------------------------------------------------------------------------------------|
| `Sport`              | `SOCCER`, `BASEBALL`, `BASKETBALL`, `VOLLEYBALL`, `ESPORTS`, `ETC`                                           |
| `Grade`              | `S`, `A`, `B`, `C`                                                                                           |
| `DeliveryType`       | `DIRECT`, `DELIVERY`, `BOTH`                                                                                 |
| `TradeDeliveryType`  | `DIRECT`, `DELIVERY`                                                                                         |
| `TradeStatus`        | `REQUESTED`, `ACCEPTED`, `PAID`, `IN_PROGRESS`, `RECEIVED`, `CONFIRMED`, `COMPLETED`, `CANCELED`, `DISPUTED` |
| `PostStatus`         | `ON_SALE`, `RESERVED`, `SOLD`, `HIDDEN`, `DELETED`                                                           |
| `PayMethod`          | `Card`, `Pay`                                                                                                |
| `PaymentStatus`      | `READY`, `PAID`, `FAILED`, `CANCELED`, `REFUNDED`                                                            |
| `PointHistoryType`   | `EARN`, `WITHDRAW`                                                                                           |
| `PointRequestStatus` | `PENDING`, `APPROVED`, `REJECTED`, `CANCELED`                                                                |
| `MemberStatus`       | `ACTIVE`, `SUSPENDED`, `WITHDRAWN`                                                                           |
| `ReportTargetType`   | `POST`, `COMMUNITY_POST`                                                                                     |
| `ReportReason`       | `FAKE`, `INAPPROPRIATE`, `FRAUD`, `ETC`                                                                      |
| `ReportStatus`       | `PENDING`, `NORMAL`, `WARNING`, `DELETED`                                                                    |
| `NotificationType`   | `TRADE`, `CHAT`, `PRICE_DROP`, `REVIEW`, `SYSTEM`                                                            |

