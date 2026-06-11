/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel builds normally (output stays undefined → standard Next app).
  // On the Pi we serve a *static export* behind Caddy: `npm run build:static`
  // sets STATIC_EXPORT=true, emitting an out/ folder of plain HTML/JS so the
  // always-on boat box runs no Node server process.
  output: process.env.STATIC_EXPORT === "true" ? "export" : undefined,
};

export default nextConfig;
