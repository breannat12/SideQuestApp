import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      // Ships a new service worker on every deploy and swaps it in without
      // asking. A service worker's whole job is serving cached files, so
      // without this an update would sit unseen behind the last one installed.
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: 'sidequest',
        short_name: 'sidequest',
        description: 'Make plans with friends in seconds — see what is on nearby and join in.',
        // Matches the app background, so the launch screen and the status bar
        // area don't flash a colour the app never uses.
        theme_color: '#EBF4FF',
        background_color: '#EBF4FF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // Cropped to whatever shape the launcher wants, so it's full-bleed.
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        // Single-page app: any unknown path is handled by the router, not the
        // server — except Firebase's own reserved paths. `/__/auth/*` is where
        // Firebase Hosting serves the OAuth handler, and letting the service
        // worker answer those with index.html breaks Google and Apple sign-in.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/__/],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
