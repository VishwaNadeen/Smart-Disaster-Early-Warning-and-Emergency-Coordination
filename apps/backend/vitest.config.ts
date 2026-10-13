
import { defineConfig, configDefaults } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolve path aliases declared in tsconfig.json.
  plugins: [tsconfigPaths()],

  test: {
    // Enable Vitest global functions.
    globals: true,

    // Set backend as the test root.
    root: './',

    // Find unit test files.
    include: ['**/*.spec.ts'],

    // Exclude Hazard Alerts tests from execution.
    exclude: [
      ...configDefaults.exclude,
      '**/hazard-alerts/**',
    ],
  },
});
