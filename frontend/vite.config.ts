import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
        manifest: {
          name: 'NLC 會員中心',
          short_name: '會員中心',
          description: 'NLC 會員中心',
          lang: 'zh-Hant-TW',
          theme_color: '#5A4FDE',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api/],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: {
      // 開發時把 /api 轉給後端，後端位址寫在 .env.local 的 VITE_API_PROXY_TARGET
      proxy: {
        '/api': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000', changeOrigin: true },
      },
    },
  }
})
