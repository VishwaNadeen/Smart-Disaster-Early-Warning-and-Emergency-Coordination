import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configure Vite with React and Tailwind CSS, plus the Vitest test runner.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/testing/setup.ts'],
    include: ['src/testing/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/pages/dmc/DisasterWarningsSection.tsx',
        'src/pages/dmc/DisasterReportsSection.tsx',
        'src/pages/dmc/DropdownSelect.tsx',
        'src/pages/dmc/AffectedAreaMap.tsx',
        'src/pages/dmc/CreateIncidentModal.tsx',
        'src/pages/dmc/sriLankaDistricts.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
})