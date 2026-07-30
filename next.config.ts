import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1000mb', // ปลดลิมิตให้อัปโหลดได้สูงสุด 1GB ต่อไฟล์
      allowedOrigins: ['localhost:3000', '*.ngrok-free.app', '*.ngrok-free.dev'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'coltnimjviwsaupkepzj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
