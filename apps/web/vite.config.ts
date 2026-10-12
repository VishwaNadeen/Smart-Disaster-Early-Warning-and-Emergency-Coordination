import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configure Vite with React and Tailwind CSS.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})