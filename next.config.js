/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ REMOVIDO: appDir não é mais necessário no Next.js 14
  // experimental: { appDir: true } - OBSOLETO
  
  // ✅ Configurações otimizadas para produção
  swcMinify: true,
  
  // ✅ Otimizações de imagem
  images: {
    domains: ['api-comexstat.mdic.gov.br'],
    unoptimized: false
  },
  
  // ✅ Headers de segurança
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
  
  // ✅ Configurações de build otimizadas
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  }
}

module.exports = nextConfig