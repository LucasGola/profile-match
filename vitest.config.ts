import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Apenas testes unitários; a integração (Testcontainers) tem config própria.
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    // Silencia o logger durante os testes (evita ruído do pino nas saídas).
    env: { LOG_LEVEL: 'silent' },
  },
});
