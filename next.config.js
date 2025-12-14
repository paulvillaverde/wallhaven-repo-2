/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Proxy Wallhaven API calls made to the dev path to avoid CORS in dev.
      // Client calls use the DEV_BASE `/wh/api/v1` and will be rewritten to
      // the real Wallhaven API.
      {
        source: '/wh/api/v1/:path*',
        destination: 'https://wallhaven.cc/api/v1/:path*',
      },
    ];
  },
}

module.exports = nextConfig
