const nextConfig = {
  trailingSlash: true,
  outputFileTracingRoot: process.cwd(),
  images: {
    unoptimized: true,
  },
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
};

export default nextConfig;
