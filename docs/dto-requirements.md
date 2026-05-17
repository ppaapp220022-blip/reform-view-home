# re:form — 백엔드 DTO 요구사항 정의서

> 작성 기준: 프론트엔드 API 호출 스펙(`src/features/*/api/`) + 백엔드 엔티티(`RE_FORM_Shop_2605`)  
> 작성일: 2026-05-08  
> 대상: 백엔드 팀 DTO 작성 참고용

---

## 목차

1. [공통 규칙](#1-공통-규칙)
2. [인증 (Auth)](#2-인증-auth)
3. [온보딩 (Onboarding)](#3-온보딩-onboarding)
4. [판매글 (Post / Listing)](#4-판매글-post--listing)
5. [채팅 (Chat)](#5-채팅-chat)
6. [거래 (Trade)](#6-거래-trade)
7. [결제 (Payment)](#7-결제-payment)
8. [포인트 / 출금 (Point)](#8-포인트--출금-point)
9. [매너 평가 (MannerReview)](#9-매너-평가-mannerreview)
10. [커뮤니티 (Community)](#10-커뮤니티-community)
11. [마이페이지 (MyPage)](#11-마이페이지-mypage)
12. [신고 (Report)](#12-신고-report)
13. [알림 (Notification)](#13-알림-notification)
14. [관리자 (Admin)](#14-관리자-admin)
15. [엔티티 설계 이슈 (확인 필요)](#15-엔티티-설계-이슈-확인-필요)

---

## 1. 공통 규칙

### 1-1. API 응답 래퍼

모든 API 응답은 아래 형식으로 감쌀 것을 권장합니다.

```java
// 성공
public record ApiResponse<T>(T data, String message) {}

// 에러
public record ErrorResponse(String code, String message, LocalDateTime timestamp) {}
```

| HTTP 상태 | 사용 케이스 |
|---|---|
| 200 OK | 조회 / 수정 성공 |
| 201 Created | 생성 성공 |
| 400 Bad Request | 유효성 실패, 잘못된 요청 |
| 401 Unauthorized | 토큰 없음 / 만료 |
| 403 Forbidden | 권한 없음 |
| 404 Not Found | 리소스 없음 |
| 409 Conflict | 이메일·닉네임 중복 |
| 429 Too Many Requests | 로그인 시도 초과 |
| 500 Internal Server Error | 서버 오류 |

### 1-2. 페이지네이션 응답

목록 조회 API는 아래 형식을 공통으로 사용합니다.

```java
public record PageResponse<T>(
    List<T> content,       // 데이터 목록
    long totalElements,    // 전체 건수
    int totalPages,        // 전체 페이지 수
    int size,              // 페이지 크기
    int number,            // 현재 페이지 번호 (0부터)
    boolean first,         // 첫 페이지 여부
    boolean last           // 마지막 페이지 여부
) {}
```

### 1-3. Enum 공통 정의

백엔드 엔티티에 선언된 Enum을 그대로 사용합니다. JSON 직렬화 시 문자열 형태로 반환합니다.

| Enum | 값 |
|---|---|
| `Role` | `USER`, `ADMIN` |
| `MemberStatus` | `ACTIVE`, `SUSPENDED`, `WITHDRAWN` |
| `Provider` | `KAKAO`, `GOOGLE` |
| `Sport` | `BASEBALL`, `SOCCER`, `BASKETBALL`, `VOLLEYBALL`, `ESPORTS`, `ETC` |
| `Grade` | `S`, `A`, `B`, `C` |
| `DeliveryType` | `DIRECT`, `DELIVERY`, `BOTH` |
| `PostStatus` | `ON_SALE`, `RESERVED`, `SOLD`, `HIDDEN`, `DELETED` |
| `TradeStatus` | `REQUESTED`, `ACCEPTED`, `PAID`, `IN_PROGRESS`, `CONFIRMED`, `COMPLETED`, `CANCELED`, `DISPUTED` |
| `TradeDeliveryType` | (확인 필요 — 엔티티에 존재하나 값 미확인) |
| `RiskLevel` | `LOW`, `MID`, `HIGH` |
| `PayMethod` | `Card`, `Pay` |
| `PaymentStatus` | `READY`, `PAID`, `FAILED`, `CANCELED`, `REFUNDED` |
| `PointHistoryType` | `EARN`, `WITHDRAW` |
| `PointRequestStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `NotificationType` | `TRADE`, `CHAT`, `PRICE_DROP`, `REVIEW`, `SYSTEM` |
| `ReportTargetType` | `POST`, `COMMUNITY_POST` |
| `ReportReason` | `FAKE`, `INAPPROPRIATE`, `FRAUD`, `ETC` |
| `ReportStatus` | `PENDING`, `NORMAL`, `WARNING`, `DELETED` |
| `CommunityPostStatus` | `ACTIVE`, `HIDDEN`, `DELETED` |

---

## 2. 인증 (Auth)

### 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/login` | 이메일 로그인 |
| POST | `/api/auth/register` | 이메일 회원가입 |
| GET | `/api/auth/check-nickname` | 닉네임 중복 확인 |
| GET | `/api/auth/me` | 내 정보 조회 (토큰 기반) |
| POST | `/api/auth/refresh` | 액세스 토큰 재발급 |
| GET | `/api/auth/oauth2/kakao` | 카카오 OAuth 리다이렉트 |
| GET | `/api/auth/oauth2/google` | 구글 OAuth 리다이렉트 |

---

### 2-1. LoginRequestDTO

```java
// POST /api/auth/login
public record LoginRequestDTO(
    @NotBlank @Email
    String email,

    @NotBlank
    String password
) {}
```

### 2-2. LoginResponseDTO

```java
// Response: 200 OK
public record LoginResponseDTO(
    String accessToken,    // JWT 액세스 토큰
    String refreshToken,   // Refresh 토큰 (HttpOnly 쿠키 또는 바디)
    AuthUserDTO user
) {}
```

### 2-3. RegisterRequestDTO

```java
// POST /api/auth/register
public record RegisterRequestDTO(
    @NotBlank @Email @Size(max = 100)
    String email,

    @NotBlank @Size(min = 2, max = 20)
    String nickname,

    @NotBlank @Size(min = 8)
    // 프론트 검증: 8자 이상 + 대문자 + 숫자 + 특수문자 중 2가지 이상 조합
    String password,

    boolean marketingAgreed   // 마케팅 수신 동의 (선택) → Member.emailEvent
) {}
```

### 2-4. RegisterResponseDTO

```java
// Response: 201 Created
// LoginResponseDTO와 동일한 구조 (자동 로그인 처리)
public record RegisterResponseDTO(
    String accessToken,
    String refreshToken,
    AuthUserDTO user
) {}
```

### 2-5. AuthUserDTO (공통 — 로그인/회원가입 응답에 포함)

```java
// Member 엔티티 기반
public record AuthUserDTO(
    Long id,                    // member_id
    String email,
    String nickname,
    String profileImageUrl,     // nullable
    Role role,                  // USER | ADMIN
    BigDecimal mannerScore      // 0.00 ~ 5.00
) {}
```

### 2-6. NicknameCheckResponseDTO

```java
// GET /api/auth/check-nickname?nickname=xxx
// Response: 200 OK
public record NicknameCheckResponseDTO(
    boolean available   // true = 사용 가능
) {}
```

### 2-7. TokenRefreshRequestDTO / ResponseDTO

```java
// POST /api/auth/refresh
public record TokenRefreshRequestDTO(String refreshToken) {}

public record TokenRefreshResponseDTO(String accessToken) {}
```

---

## 3. 온보딩 (Onboarding)

회원가입 직후 Step 2에서 관심 종목·구단·키워드를 설정합니다.  
`InterestSetting` + `InterestKeyword` 엔티티에 저장됩니다.

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/onboarding/interest` | 관심 설정 저장 (최초 1회) |
| PUT | `/api/onboarding/interest` | 관심 설정 수정 |
| GET | `/api/onboarding/interest` | 내 관심 설정 조회 |

### 3-1. OnboardingRequestDTO

```java
// POST/PUT /api/onboarding/interest
public record OnboardingRequestDTO(
    @NotNull
    Sport sport,                   // 관심 종목 (InterestSetting.sport)

    @Size(max = 100)
    String team,                   // 관심 구단 (nullable, InterestSetting.team)

    @Size(max = 10)
    List<@NotBlank @Size(max = 200) String> keywords   // 관심 키워드 목록 (InterestKeyword)
) {}
```

### 3-2. OnboardingResponseDTO

```java
// Response: 201 Created / 200 OK
public record OnboardingResponseDTO(
    Sport sport,
    String team,
    List<String> keywords
) {}
```

---

## 4. 판매글 (Post / Listing)

### 엔드포인트

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/posts` | 판매글 목록 (필터·검색·정렬) | 불필요 |
| GET | `/api/posts/{postId}` | 판매글 상세 | 불필요 |
| POST | `/api/posts` | 판매글 등록 | 필요 |
| PUT | `/api/posts/{postId}` | 판매글 수정 | 필요 (본인) |
| DELETE | `/api/posts/{postId}` | 판매글 삭제 | 필요 (본인) |
| POST | `/api/posts/{postId}/wish` | 찜 토글 | 필요 |
| GET | `/api/posts/{postId}/wish` | 찜 여부 확인 | 필요 |

### 4-1. PostCreateRequestDTO

```java
// POST /api/posts  (multipart/form-data — 이미지 첨부 포함)
public record PostCreateRequestDTO(
    @NotBlank @Size(max = 200)
    String title,

    @NotBlank
    String content,

    @NotNull
    Sport sport,

    @NotBlank @Size(max = 50)
    String team,                // 구단명 문자열 (자유 입력)

    @NotBlank @Size(max = 200)
    String uniformName,

    @NotNull
    Grade grade,

    @Size(max = 10)
    String size,                // 유니폼 사이즈 (예: "XL", "105")

    Boolean marking,            // 마킹 여부 (default: false)

    @NotNull @Min(0)
    int price,

    @NotNull
    DeliveryType deliveryType
) {}
// 이미지: MultipartFile[] images (별도 파라미터 또는 FormData)
```

### 4-2. PostUpdateRequestDTO

```java
// PUT /api/posts/{postId}
// 거래 진행 중(RESERVED/SOLD)이면 수정 제한 → 서버에서 PostStatus 검증 필요
public record PostUpdateRequestDTO(
    @Size(max = 200)  String title,
    String content,
    Grade grade,
    @Size(max = 10)   String size,
    Boolean marking,
    Integer price,
    DeliveryType deliveryType
    // sport·team·uniformName은 수정 불가 (정책상)
) {}
```

### 4-3. PostCardDTO (목록 공통)

```java
// 목록 조회, 검색 결과에서 반복 사용하는 카드 단위 DTO
public record PostCardDTO(
    Long postId,
    String title,
    String team,
    Sport sport,
    int price,
    Grade grade,
    String size,
    DeliveryType deliveryType,
    PostStatus status,
    int viewCount,
    int wishCount,
    boolean isWished,          // 로그인 사용자 기준 찜 여부 (비로그인 시 false)
    String thumbnailUrl,       // images[0] URL
    String timeAgo,            // "3시간 전" 형식 (서버에서 계산하거나 createdAt 반환)
    LocalDateTime createdAt,
    SellerBriefDTO seller
) {}

public record SellerBriefDTO(
    Long memberId,
    String nickname,
    String profileImageUrl,
    BigDecimal mannerScore
) {}
```

### 4-4. PostDetailDTO

```java
// GET /api/posts/{postId}
public record PostDetailDTO(
    Long postId,
    String title,
    String content,
    Sport sport,
    String team,
    String uniformName,
    Grade grade,
    String size,
    Boolean marking,
    int price,
    DeliveryType deliveryType,
    PostStatus status,
    RiskLevel riskLevel,       // AI 사기 탐지 결과
    int viewCount,
    int wishCount,
    boolean isWished,
    List<String> imageUrls,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    SellerBriefDTO seller,
    Long tradeId               // 거래 연결된 경우 tradeId, 없으면 null
) {}
```

### 4-5. 목록 조회 쿼리 파라미터

```
GET /api/posts
  ?sport=SOCCER          (Sport enum, optional)
  &grade=A               (Grade enum, optional)
  &deliveryType=DELIVERY (DeliveryType enum, optional)
  &minPrice=10000        (optional)
  &maxPrice=100000       (optional)
  &sort=latest           (latest | price_asc | price_desc | popular)
  &page=0
  &size=20
```

응답: `PageResponse<PostCardDTO>`

---

## 5. 채팅 (Chat)

> 채팅 메시지 실시간 전송은 WebSocket(STOMP) 별도 구현 — 아래는 REST API 부분만 정의합니다.

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/chats` | 채팅방 생성 (구매자 → 판매자) |
| GET | `/api/chats` | 내 채팅방 목록 |
| GET | `/api/chats/{chatId}` | 채팅방 상세 + 메시지 이력 |

### 5-1. ChatRoomCreateRequestDTO

```java
// POST /api/chats
public record ChatRoomCreateRequestDTO(
    @NotNull Long postId   // 연결할 판매글 ID
) {}
```

### 5-2. ChatRoomSummaryDTO (목록)

```java
// GET /api/chats
public record ChatRoomSummaryDTO(
    Long chatId,
    MemberBriefDTO partner,    // 상대방 (내가 구매자면 seller, 판매자면 buyer)
    String lastMessage,        // 마지막 메시지 내용 (미리보기)
    LocalDateTime lastMessageAt,
    int unreadCount,
    PostBriefDTO post          // 연결된 판매글 요약
) {}

public record PostBriefDTO(
    Long postId,
    String title,
    String thumbnailUrl,
    int price,
    PostStatus status
) {}

public record MemberBriefDTO(
    Long memberId,
    String nickname,
    String profileImageUrl
) {}
```

### 5-3. ChatRoomDetailDTO

```java
// GET /api/chats/{chatId}
public record ChatRoomDetailDTO(
    Long chatId,
    MemberBriefDTO buyer,
    MemberBriefDTO seller,
    PostBriefDTO post,
    Long tradeId,              // 거래 연결된 경우 (null 가능)
    TradeStatus tradeStatus,   // 거래 상태 (null 가능)
    PageResponse<ChatMessageDTO> messages
) {}
```

### 5-4. ChatMessageDTO

```java
// WebSocket 메시지 및 이력 조회 공통 사용
public record ChatMessageDTO(
    Long messageId,
    Long senderId,
    String content,
    String type,               // "TEXT" | "IMAGE" | "SYSTEM"
    LocalDateTime creatAt,
    boolean isRead
) {}
```

---

## 6. 거래 (Trade)

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/trades` | 거래 요청 (구매자) |
| GET | `/api/trades/{tradeId}` | 거래 상세 |
| PATCH | `/api/trades/{tradeId}/status` | 거래 상태 변경 |
| PATCH | `/api/trades/{tradeId}/delivery` | 배송지 입력 (배송 거래 시) |

### 6-1. TradeCreateRequestDTO

```java
// POST /api/trades
public record TradeCreateRequestDTO(
    @NotNull Long postId
) {}
```

### 6-2. TradeResponseDTO

```java
// GET /api/trades/{tradeId}
public record TradeResponseDTO(
    Long tradeId,
    PostBriefDTO post,
    MemberBriefDTO buyer,
    MemberBriefDTO seller,
    TradeStatus status,
    TradeDeliveryType deliveryType,
    String deliveryAddress,
    int tradePrice,
    LocalDateTime completedAt,
    LocalDateTime confirmedAt,
    LocalDateTime createdAt,
    boolean hasReview          // 매너 평가 완료 여부
) {}
```

### 6-3. TradeStatusUpdateRequestDTO

```java
// PATCH /api/trades/{tradeId}/status
// 판매자: ACCEPTED, CANCELED
// 구매자: CONFIRMED(구매 확정), DISPUTED
// 시스템: PAID, IN_PROGRESS, COMPLETED
public record TradeStatusUpdateRequestDTO(
    @NotNull TradeStatus status
) {}
```

### 6-4. DeliveryInfoRequestDTO

```java
// PATCH /api/trades/{tradeId}/delivery
public record DeliveryInfoRequestDTO(
    @NotBlank @Size(max = 300)
    String deliveryAddress
) {}
```

---

## 7. 결제 (Payment)

> 토스페이먼츠 연동 흐름: 프론트에서 주문 초기화 요청 → 토스 결제창 → 콜백 → 서버 검증 승인

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/payments/init` | 결제 초기화 (주문 생성) |
| POST | `/api/payments/confirm` | 토스 결제 승인 |
| GET | `/api/payments/{tradeId}` | 결제 정보 조회 |

### 7-1. PaymentInitRequestDTO

```java
// POST /api/payments/init
public record PaymentInitRequestDTO(
    @NotNull Long tradeId,
    @NotNull PayMethod payMethod
) {}
```

### 7-2. PaymentInitResponseDTO

```java
// Response: 201 Created
public record PaymentInitResponseDTO(
    String tossOrderId,     // 프론트에서 토스 결제창에 전달
    String orderName,       // 상품명 (토스 결제창 표시용)
    int amount              // 결제 금액
) {}
```

### 7-3. PaymentConfirmRequestDTO

```java
// POST /api/payments/confirm  (토스 콜백 후 프론트가 호출)
public record PaymentConfirmRequestDTO(
    @NotBlank String paymentKey,
    @NotBlank String orderId,
    @NotNull Integer amount
) {}
```

### 7-4. PaymentResponseDTO

```java
// Response: 200 OK
public record PaymentResponseDTO(
    Long paymentId,
    Long tradeId,
    PayMethod payMethod,
    int amount,
    PaymentStatus status,
    String approvalNo,
    LocalDateTime paidAt
) {}
```

---

## 8. 포인트 / 출금 (Point)

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/points/wallet` | 포인트 지갑 조회 |
| GET | `/api/points/history` | 포인트 내역 목록 |
| POST | `/api/points/withdraw` | 출금 요청 |
| GET | `/api/points/withdraw` | 내 출금 요청 목록 |

### 8-1. PointWalletResponseDTO

```java
// GET /api/points/wallet
public record PointWalletResponseDTO(
    int balance,         // 총 보유 포인트
    int withdrawable,    // 출금 가능 포인트
    int pending          // 정산 대기 포인트 (구매 확정 전)
) {}
```

### 8-2. PointHistoryItemDTO

```java
// GET /api/points/history → PageResponse<PointHistoryItemDTO>
public record PointHistoryItemDTO(
    Long pointId,
    PointHistoryType type,    // EARN | WITHDRAW
    int changeAmount,         // 변동량 (양수/음수)
    int balance,              // 변동 후 잔액
    Long tradeId,             // 연결 거래 ID (null 가능)
    LocalDateTime createdAt
) {}
```

### 8-3. WithdrawRequestDTO

```java
// POST /api/points/withdraw
public record WithdrawRequestDTO(
    @NotNull @Min(1000)
    int requestAmount,

    @NotBlank @Size(max = 50)
    String bankName,

    @NotBlank @Size(max = 30)
    String accountNumber
) {}
```

### 8-4. WithdrawResponseDTO

```java
public record WithdrawResponseDTO(
    Long withdrawId,
    int requestAmount,
    String bankName,
    String accountNumber,
    PointRequestStatus status,
    LocalDateTime createdAt
) {}
```

---

## 9. 매너 평가 (MannerReview)

> **주의**: 현재 `MannerReview` 엔티티에 별점(score) 필드가 없습니다.  
> 와이어프레임에는 별점 UI가 포함되어 있으므로 엔티티 수정이 필요합니다. ([15번 이슈](#15-엔티티-설계-이슈-확인-필요) 참고)

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/reviews` | 매너 평가 작성 |
| GET | `/api/reviews/{tradeId}` | 거래 매너 평가 조회 |
| GET | `/api/members/{memberId}/reviews` | 특정 회원의 매너 평가 목록 |

### 9-1. MannerReviewCreateRequestDTO

```java
// POST /api/reviews
public record MannerReviewCreateRequestDTO(
    @NotNull Long tradeId,

    // score 필드 — 엔티티에 추가 시 포함
    // @NotNull @Min(1) @Max(5)
    // int score,

    @Size(max = 500)
    String content          // 후기 텍스트 (선택)
) {}
```

### 9-2. MannerReviewResponseDTO

```java
public record MannerReviewResponseDTO(
    Long mannerId,
    Long tradeId,
    MemberBriefDTO buyer,
    MemberBriefDTO seller,
    // int score,
    String content,
    LocalDateTime createdAt
) {}
```

---

## 10. 커뮤니티 (Community)


> **DDL 확정 (2026-05-08)**
> ```sql
> sport_category ENUM('SOCCER','BASEBALL','BASKETBALL','VOLLEYBALL','ESPORTS','etc')
> status         ENUM('ACTIVE','HIDDEN','DELETED')
> ```
> `sport_category`의 `etc` 값은 DB 저장 시 소문자임에 주의 (Java Enum 상수명과 불일치 — 백엔드 팀 확인 필요)

### 엔드포인트

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/community` | 게시글 목록 | 불필요 |
| GET | `/api/community/{commId}` | 게시글 상세 | 불필요 |
| POST | `/api/community` | 게시글 작성 | 필요 |
| PUT | `/api/community/{commId}` | 게시글 수정 | 필요 (본인) |
| DELETE | `/api/community/{commId}` | 게시글 삭제 | 필요 (본인) |
| POST | `/api/community/{commId}/like` | 좋아요 토글 | 필요 |
| GET | `/api/community/{commId}/replies` | 댓글 목록 | 불필요 |
| POST | `/api/community/{commId}/replies` | 댓글 작성 | 필요 |
| DELETE | `/api/community/replies/{replyId}` | 댓글 삭제 | 필요 (본인) |
| POST | `/api/community/replies/{replyId}/like` | 댓글 좋아요 | 필요 |

### 10-1. CommunityPostCreateRequestDTO

```java
// POST /api/community
public record CommunityPostCreateRequestDTO(
    @NotNull
    SportCategory sportCategory,

    @Size(max = 50)
    String teamCategory,              // 관련 구단 (선택)

    @NotBlank @Size(max = 200)
    String commTitle,

    @NotBlank
    String commContent,

    @Size(max = 500)
    String commImageUrl               // 첨부 이미지 URL (선택 — 업로드 후 URL 전달)
) {}
```

### 10-2. CommunityPostListItemDTO

```java
// GET /api/community → PageResponse<CommunityPostListItemDTO>
public record CommunityPostListItemDTO(
    Long commId,
    SportCategory sportCategory,
    String teamCategory,
    String commTitle,
    int commViewCount,
    int likeCount,
    int commentCount,
    CommunityPostStatus status,
    MemberBriefDTO author,
    LocalDateTime createdAt
) {}
```

### 10-3. CommunityPostDetailDTO

```java
// GET /api/community/{commId}
public record CommunityPostDetailDTO(
    Long commId,
    SportCategory sportCategory,
    String teamCategory,
    String commTitle,
    String commContent,
    String commImageUrl,
    int commViewCount,
    int likeCount,
    int commentCount,
    boolean isLiked,          // 로그인 사용자 기준
    CommunityPostStatus status,
    MemberBriefDTO author,
    LocalDateTime createdAt
) {}
```

### 10-4. ReplyCreateRequestDTO

```java
// POST /api/community/{commId}/replies
public record ReplyCreateRequestDTO(
    @NotBlank
    String replyContent,

    Long parentId          // 대댓글인 경우 부모 replyId, 최상위면 null
) {}
```

### 10-5. ReplyResponseDTO

```java
public record ReplyResponseDTO(
    Long replyId,
    MemberBriefDTO author,
    String replyContent,
    int likeCount,
    boolean isLiked,
    boolean isDeleted,
    LocalDateTime createdAt,
    List<ReplyResponseDTO> children   // 대댓글 목록 (최대 1단계)
) {}
```

---

## 11. 마이페이지 (MyPage)

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/members/me` | 내 프로필 + 통계 |
| PUT | `/api/members/me` | 프로필 수정 |
| GET | `/api/members/me/posts` | 내 판매글 목록 |
| GET | `/api/members/me/trades` | 내 거래 목록 |
| GET | `/api/members/me/wished` | 찜 목록 |
| GET | `/api/members/{memberId}` | 타 회원 공개 프로필 |

### 11-1. MyProfileResponseDTO

```java
// GET /api/members/me
public record MyProfileResponseDTO(
    Long memberId,
    String email,
    String nickname,
    String profileImageUrl,
    String bio,
    BigDecimal mannerScore,
    Role role,
    MemberStatus status,

    // 포인트 지갑 요약
    int pointBalance,
    int pointWithdrawable,
    int pointPending,

    // 거래 통계 (집계 또는 별도 쿼리)
    int totalSales,          // 완료된 판매 건수
    int totalPurchases,      // 완료된 구매 건수

    // 관심 설정
    OnboardingResponseDTO interest,

    LocalDateTime createdAt
) {}
```

### 11-2. ProfileUpdateRequestDTO

```java
// PUT /api/members/me
public record ProfileUpdateRequestDTO(
    @Size(min = 2, max = 20)
    String nickname,

    @Size(max = 500)
    String profileImageUrl,

    @Size(max = 200)
    String bio
) {}
```

### 11-3. 공개 프로필 (타 회원 조회)

```java
// GET /api/members/{memberId}
public record MemberPublicProfileDTO(
    Long memberId,
    String nickname,
    String profileImageUrl,
    String bio,
    BigDecimal mannerScore,
    int totalSales,
    List<MannerReviewResponseDTO> recentReviews   // 최근 매너 평가 3~5건
) {}
```

---

## 12. 신고 (Report)

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/reports` | 신고 접수 |
| GET | `/api/reports/me` | 내가 접수한 신고 목록 |

### 12-1. ReportCreateRequestDTO

```java
// POST /api/reports
public record ReportCreateRequestDTO(
    @NotNull ReportTargetType targetType,   // POST | COMMUNITY_POST
    @NotNull Long targetId,
    @NotNull ReportReason reason,           // FAKE | INAPPROPRIATE | FRAUD | ETC

    @Size(max = 500)
    String detail                           // 상세 내용 (선택)
) {}
```

### 12-2. ReportResponseDTO

```java
public record ReportResponseDTO(
    Long reportId,
    ReportTargetType targetType,
    Long targetId,
    ReportReason reason,
    String detail,
    ReportStatus status,
    LocalDateTime createdAt
) {}
```

---

## 13. 알림 (Notification)

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/notifications` | 알림 목록 |
| PATCH | `/api/notifications/{notiId}/read` | 단건 읽음 처리 |
| PATCH | `/api/notifications/read-all` | 전체 읽음 처리 |

### 13-1. NotificationListResponseDTO

```java
// GET /api/notifications
public record NotificationListResponseDTO(
    List<NotificationItemDTO> items,
    int unreadCount
) {}
```

### 13-2. NotificationItemDTO

```java
public record NotificationItemDTO(
    Long notiId,
    NotificationType type,      // TRADE | CHAT | PRICE_DROP | REVIEW | SYSTEM
    String content,             // reportContent 필드 (알림 내용)
    String linkUrl,             // 클릭 시 이동 경로
    boolean isRead,
    LocalDateTime createdAt
) {}
```

---

## 14. 관리자 (Admin)

> 모든 관리자 API는 `Role.ADMIN` 권한 필수

### 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/admin/members` | 회원 목록 (검색·필터) |
| GET | `/api/admin/members/{memberId}` | 회원 상세 |
| PATCH | `/api/admin/members/{memberId}/action` | 회원 제재 (경고·정지·탈퇴) |
| GET | `/api/admin/reports` | 신고 목록 |
| GET | `/api/admin/reports/{reportId}` | 신고 상세 |
| PATCH | `/api/admin/reports/{reportId}/action` | 신고 처리 |
| GET | `/api/admin/withdraws` | 출금 요청 목록 |
| PATCH | `/api/admin/withdraws/{withdrawId}/action` | 출금 승인·반려 |

### 14-1. AdminMemberListItemDTO

```java
// GET /api/admin/members → PageResponse<AdminMemberListItemDTO>
public record AdminMemberListItemDTO(
    Long memberId,
    String email,
    String nickname,
    MemberStatus status,
    int warningCount,
    BigDecimal mannerScore,
    LocalDateTime createdAt
) {}
```

### 14-2. AdminMemberDetailDTO

```java
// GET /api/admin/members/{memberId}
public record AdminMemberDetailDTO(
    Long memberId,
    String email,
    String nickname,
    String profileImageUrl,
    String bio,
    MemberStatus status,
    int warningCount,
    BigDecimal mannerScore,
    Role role,
    LocalDateTime createdAt,

    List<ReportResponseDTO> receivedReports,   // 해당 회원이 신고당한 내역
    int totalSales,
    int totalPurchases
) {}
```

### 14-3. AdminMemberActionRequestDTO

```java
// PATCH /api/admin/members/{memberId}/action
public record AdminMemberActionRequestDTO(
    @NotNull MemberAction action,    // WARN | SUSPEND | WITHDRAW (별도 Enum 정의 필요)

    @Size(max = 300)
    String reason
) {}
```

### 14-4. AdminReportActionRequestDTO

```java
// PATCH /api/admin/reports/{reportId}/action
public record AdminReportActionRequestDTO(
    @NotNull ReportStatus action    // NORMAL | WARNING | DELETED
) {}
```

### 14-5. AdminWithdrawActionRequestDTO

```java
// PATCH /api/admin/withdraws/{withdrawId}/action
public record AdminWithdrawActionRequestDTO(
    @NotNull WithdrawAction action,   // APPROVE | REJECT (별도 Enum 정의 필요)

    @Size(max = 300)
    String rejectReason               // REJECT 시 필수
) {}
```

---

## 15. 엔티티 설계 이슈 (확인 필요)

백엔드 엔티티를 검토하면서 발견한 불일치 항목입니다. **DTO 작업 전에 팀 내 확인이 필요합니다.**

### Issue 1 — `Post.team` 타입 오류

```java
// 현재 엔티티 (Post.java)
@Column(name = "team", nullable = false, length = 50)
private Sport team;   // Sport enum 타입인데 필드명은 team
```

`team`은 구단명 문자열이어야 하는데 `Sport` enum으로 선언되어 있습니다.  
→ **`String team`으로 수정 필요**

---

### Issue 2 — `MannerReview`에 별점(score) 필드 없음

와이어프레임(화면 15)에는 별점 UI가 포함되어 있으나 엔티티에 score 필드가 없습니다.

```java
// 추가가 필요한 필드
@Column(name = "score", nullable = false)
@Min(1) @Max(5)
private int score;
```

또한 `mannerScore`는 현재 `BigDecimal(0.00)`으로 초기화되어 있으나, 매너 평가 평균 계산 로직이 명시되어 있지 않습니다. 리뷰 작성 시 `Member.mannerScore` 업데이트 로직 구현이 필요합니다.

---

### Issue 3 — `Sport`, `SportType`, `SportCategory` Enum 중복

세 Enum의 값이 동일합니다 (`SOCCER`, `BASEBALL`, `BASKETBALL`, `VOLLEYBALL`, `ESPORTS`).

```java
// 현재: 세 파일에 동일한 내용
enum Sport         { SOCCER, BASEBALL, BASKETBALL, VOLLEYBALL, ESPORTS, ETC }
enum SportType     { SOCCER, BASEBALL, BASKETBALL, VOLLEYBALL, ESPORTS, ETC }
enum SportCategory { SOCCER, BASEBALL, BASKETBALL, VOLLEYBALL, ESPORTS, ETC }
```

→ **하나로 통합 (`Sport`)하고 나머지를 제거하거나 alias 처리 권장**  
혼재 사용 시 DTO 매핑에서 혼란이 생깁니다.

---

### Issue 4 — `Reply`가 `CommunityPost`가 아닌 `Post`(거래글)에 연결

```java
// Reply.java 현재
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "post_id", nullable = false)
private Post postId;   // trade.Post (거래글)
```

커뮤니티 댓글이므로 `CommunityPost`와 연결되어야 합니다.  
→ **`CommunityPost communityPost`로 수정 필요**

---

### Issue 5 — `ChatRoom.tradeId` 네이밍

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "trade_id", updatable = false)
private Trade tradeId;   // 필드명이 tradeId인데 Trade 엔티티 타입
```

JPA 관례상 `private Trade trade`로 작성하는 것이 적합합니다.  
→ **`private Trade trade`로 리네이밍 권장** (기능 영향 없음, 가독성 개선)

