/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Next.js to transpile our local workspace package (TypeScript source)
  transpilePackages: ['@approvals/contracts'],
};

module.exports = nextConfig;
