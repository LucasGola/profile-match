// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Arquivos/pastas ignorados globalmente
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'src/generated/**', 'web/**'],
  },
  js.configs.recommended,
  {
    // Lint com informação de tipos aplica-se apenas ao código-fonte TS.
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Variáveis não usadas são erro; prefixo _ escapa (padrão idiomático).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Em testes, referenciar métodos de mocks (vi.mocked(obj.metodo)) é padrão;
    // a regra unbound-method gera falso-positivo nesse caso.
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  // Deve vir por último: desliga regras de formatação que conflitam com o Prettier
  eslintConfigPrettier,
);
