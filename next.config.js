/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Proxy all requests under /wh to the Wallhaven host, preserving path
      // and query. This mirrors the Vite proxy config which forwarded
      // /wh -> https://wallhaven.cc and rewrote paths.
      {
        source: '/wh/:path*',
        destination: 'https://wallhaven.cc/:path*',
      },
    ];
  },
}

module.exports = nextConfig
