import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // 👇 1. 프론트엔드가 /api/boards/... 로 요청하면 가로챕니다.
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        // 👇 2. 백엔드에 던져주기 직전에 /api 글자만 싹 지워서 보냅니다. (백엔드는 모름!)
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      // 미디어 파일이나 헬스체크는 화면 URL과 겹칠 일이 없으니 놔둡니다.
      "/files": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
})