import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import vercelConfig from './vercel.json' with { type: 'json' }

// The production security headers (Content-Security-Policy included) live in vercel.json.
// `vite preview`, which the E2E tests run against, sends the same ones, so a policy that would
// break the app fails the tests instead of the live site.
const productionHeaders = Object.fromEntries(
  vercelConfig.headers.flatMap(({ headers }) => headers.map(({ key, value }) => [key, value])),
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),  tailwindcss(),],
  server: {
    // The browser only ever calls /api on its own origin; Vite forwards it to the Express API.
    // `vite preview` reuses this proxy. E2E tests point it at their own API instance.
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000' },
  },
  preview: { headers: productionHeaders },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
