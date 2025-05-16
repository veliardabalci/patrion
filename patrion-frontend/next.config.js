/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Docker için optimize edilmiş çıktı
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true, // Opsiyonel: Build sırasında eslint hatalarını görmezden gel
  },
  typescript: {
    ignoreBuildErrors: false, // TypeScript hatalarını build'i engellemesi için false bırakın
  },
  images: {
    domains: ['localhost'], // Eğer harici resim kullanıyorsanız buraya eklemeyi unutmayın
  },
  // API proxy ayarları (opsiyonel)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`
      }
    ];
  }
};

module.exports = nextConfig; 