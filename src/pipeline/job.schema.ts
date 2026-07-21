import { z } from 'zod';

/**
 * Schema canônico da vaga já normalizada, antes da persistência.
 *
 * Cada fonte é responsável por mapear seu formato bruto para este schema.
 * A validação com zod garante que dados heterogêneos das fontes cheguem
 * ao pipeline em um formato único e confiável.
 */
export const normalizedJobSchema = z.object({
  title: z.string().trim().min(1, 'título vazio'),
  company: z.string().trim().min(1, 'empresa vazia'),
  url: z.url('url inválida'),
  location: z.string().trim().min(1).nullable().default(null),
  description: z.string().trim().min(1).nullable().default(null),
});

export type NormalizedJob = z.infer<typeof normalizedJobSchema>;
