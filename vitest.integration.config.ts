import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    env: { LOG_LEVEL: 'silent' },
    // Subir containers (pull + boot) é lento na primeira vez.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Um container por arquivo; sem paralelismo entre arquivos de integração.
    fileParallelism: false,
  },
});
