/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
