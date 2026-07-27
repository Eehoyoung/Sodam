import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // docker-compose 컨테이너 이미지를 슬림하게 유지하기 위해 standalone 산출물 사용
  // (07_배포_운영계획.md §2 — sodam-web-master 서비스).
  output: "standalone",
};

export default nextConfig;
