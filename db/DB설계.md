# 신대신문 — DB 설계 개요

## 기술 선택 (추천)
- **백엔드: Supabase (PostgreSQL)** — 가장 안정적. 인증(카카오 OAuth)·파일 스토리지·자동 API·행단위 보안(RLS)이 한 곳에 통합. 서버 직접 운영 불필요.
- **언어: TypeScript** (Next.js App Router + `@supabase/supabase-js`)
- **배포: Vercel** / 사진: Supabase Storage / 도메인 연결만 추가

왜 Postgres인가: 회원 등급·승인·신고처럼 **관계와 규칙이 많은 데이터**는 관계형 DB가 가장 안전하고, RLS로 "본인 글만 수정" 같은 권한을 DB가 직접 강제해 보안 사고를 막는다.

## 테이블 한눈에 (총 34개)
- 회원/기사: `profiles` `nickname_history` `categories` `articles` `article_views` `article_reactions` `comments`
- 통계: `page_views` (사이트 접속) + `article_views`(기사별 읽음)
- 자유게시판: `board_posts` `board_photos` `board_comments` `board_likes`
- 제보/기자: `tips` `reporter_applications`
- 나눔마켓: `market_posts` `market_photos` `market_comments`
- 상권/업체: `businesses` `business_members` `business_photos` `business_menus` `promo_posts`
- 지역단체: `organizations` `org_photos` `org_members` `org_posts`
- 광고: `ad_slots` `ads` `ad_requests`
- 공통: `reports` `favorites`

## 핵심 설계 포인트
- **좋아요·싫어요 중복 방지** → `article_reactions` 에 `unique(article_id, ip_hash)`. IP당 1행만, 변경은 update.
- **신고 통합** → `reports(target_type, target_id)` 하나로 기사·댓글·업체·단체·나눔글 모두 처리.
- **승인 흐름** → 업체/단체/기자/광고/홍보글은 `status='pending'` 으로 들어오고 관리자(또는 단체 운영진) 승인 후 노출.
- **기자 책임 서약** → `reporter_applications` 에 동의여부·서명·일시·IP 저장(분쟁 시 책임 증빙).
- **핫소식** → `article_views` 로그를 기간(일/주/월)으로 집계해 베스트 정렬.
- **카톡 1:1 문의** → 업체/단체의 `kakao_channel` URL 저장 → 버튼에서 채널 채팅 연결.
- **자체 닉네임** → `profiles.nickname` 중복불가, 가입 직후 설정·변경 가능, `nickname_history` 로 변경 이력·강제변경 관리.
- **접속/읽음 통계** → `page_views`(방문자·PV·유입경로), `article_views.scroll_pct`(읽음률)·`dwell_ms`(체류시간)로 기사별 몰입도까지 분석.

## 회원 등급별 권한
| 등급 | 권한 | 부여 방식 |
|---|---|---|
| 일반회원 | 댓글·나눔글·찜·신고·단체 가입신청 | 카카오 로그인 시 자동 |
| 업체회원 | + 업체 운영·홍보글(승인) | 업체 등록 → 관리자 승인 |
| 단체운영진 | + 단체 소식·회원 가입승인 | 단체 등록 → 관리자 승인 |
| 시민기자 | + 기사 작성·발행 | 기자 신청+서약 → 관리자 승인 |
| 관리자(편집장) | 전체 콘텐츠·신고·승인 관리 | 지정 |
| 슈퍼관리자 | 관리자 권한·사이트 설정 | 지정 |

> 사이트 기본 등급은 `profiles.role` (user/reporter/admin/superadmin).
> 업체·단체 권한은 `business_members` / `org_members` 멤버십으로 부여 → 한 사람이 업체회원이면서 동시에 단체운영진·기자일 수 있음.

## 다음 단계
1. Supabase 프로젝트 생성 → SQL Editor 에 `schema.sql` 실행
2. 카카오 OAuth 연결(Authentication → Kakao) + Redirect URI 등록
3. Storage 버킷 생성: `articles`, `market`, `business`, `org`, `ads`
4. 나머지 테이블 RLS 정책 마저 작성 → Next.js 골격 셋업
