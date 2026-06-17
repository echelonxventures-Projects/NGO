/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Slim, self-contained server bundle for Docker/serverless deployment.
  output: 'standalone',
  // The public site is rendered per-request (SSR) so tenant branding/content is always live.
};

export default nextConfig;
