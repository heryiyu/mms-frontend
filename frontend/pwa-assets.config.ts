import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// 從 public/logo.svg 產生 PWA 圖示；換 Logo 後執行 npm run generate-pwa-assets
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})
