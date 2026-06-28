# 배포 가이드 (Vercel)

신대신문 모바일 웹의 배포·운영 전 체크리스트.

## 1. 선결: Supabase 실연동 (목 → 실데이터)

현재 데이터는 `lib/mock/*` 목 데이터다. 실서비스 전 아래를 완료해야 한다.

1. Supabase 프로젝트 생성 → `Settings > API`에서 URL·anon key·service role key 복사
2. SQL Editor에서 `db/schema.sql` 전체 실행 (34테이블 + RLS)
3. Storage 버킷 생성: `articles` `board` `market` `business` `org` `ads`
4. Auth > Providers에서 **카카오** 활성화, 카카오 개발자 앱의 REST 키 등록
   - Redirect URL에 `https://<배포도메인>/auth/callback` 추가
5. 카카오 개발자 콘솔: 사이트 도메인·Redirect URI 등록

> `.env`가 채워지면 `lib/auth.ts`의 데모(쿠키) 인증은 자동 비활성되고 실제 카카오 OAuth로 동작한다.

## 2. 환경 변수 (Vercel Project Settings > Environment Variables)

`.env.local.example` 참고. 4개 모두 등록:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # 서버 전용. 절대 NEXT_PUBLIC_ 금지
NEXT_PUBLIC_SITE_URL=https://<배포도메인>   # sitemap/robots/OG에 사용
```

## 3. 배포

1. GitHub 저장소 연결 후 Vercel `Import Project` (Framework: Next.js 자동 인식)
2. 위 환경변수 등록 → `Deploy`
3. 커스텀 도메인 연결 (예: sindaenews.kr) → `NEXT_PUBLIC_SITE_URL`을 해당 도메인으로 갱신 후 재배포

## 4. 배포 후 확인

- [ ] 카카오 로그인 → 온보딩(닉네임) → 마이페이지
- [ ] `/sitemap.xml`, `/robots.txt` 정상 출력 (도메인 반영 확인)
- [ ] 관리자 계정으로 `/admin` 접근, 비관리자 차단 확인
- [ ] OG 미리보기(카카오톡 공유 시 제목·설명 노출)

## 5. 남은 콘텐츠 작업

- 법적 페이지(`lib/legal.ts`)의 `⚠️확인요망` 항목: 발행인·편집인·청소년보호책임자·등록번호·연락처 확정
- 로고(`public/logo.svg`) 및 manifest 아이콘 추가
- 광고: 자동 광고(애드핏/애드센스) 스크립트 연동은 별도
