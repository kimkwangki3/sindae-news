/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 클라이언트 라우터 캐시를 끈다.
  //
  // 메뉴를 옮겼다가 돌아오면 Next는 서버에 다시 묻지 않고 브라우저가 받아둔
  // 예전 화면을 그대로 쓴다. 관리자 대시보드가 두 시간 전 접속 수치를 들고
  // 있던 원인이 이것이다(새로고침하면 맞는 값이 나왔다). 기사 목록·승인 큐도
  // 같은 이유로 옛 값을 보여줄 수 있다.
  //
  // 이 사이트는 대부분의 화면이 force-dynamic이다. "지금 값"을 보려고 서버에서
  // 매번 그리는데 브라우저가 옛 화면을 재활용하면 그 노력이 무의미해진다.
  experimental: {
    staleTimes: { dynamic: 0 },
  },
  images: {
    // Supabase Storage 공개 버킷 이미지 허용 (URL은 .env로 주입 후 도메인 추가)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // 필자 프로필을 개인 성명에서 편집부로 바꾸면서 주소가 달라졌다(2026-08-12).
  // 옛 주소는 사이트맵에 올라가 색인됐을 수 있으므로 404로 떨구지 않는다.
  async redirects() {
    return [
      {
        source: "/reporters/kimkwangki",
        destination: "/reporters/haeryong",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
