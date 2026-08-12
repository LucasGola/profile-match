import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Apenas testes unitários; a integração (Testcontainers) tem config própria.
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.integration.test.ts'],
    env: {
      // Silencia o logger durante os testes (evita ruído do pino nas saídas).
      LOG_LEVEL: 'silent',
      // URL dummy: o client Prisma é lazy e nunca conecta nos unitários
      // (rotas mockam o repositório). Evita o guard de DATABASE_URL no import.
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
  },
});
