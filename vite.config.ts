import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The printed poster's QR code points at https://sourypink.github.io/vitalis/ — keep this base.
export default defineConfig({
  base: '/vitalis/',
  plugins: [react()],
})
