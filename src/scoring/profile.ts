import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { logger } from '../logger.js';

/** Lista de termos normalizados (trim + minúsculas), sem vazios. */
const termList = z
  .array(z.string())
  .default([])
  .transform((terms) =>
    terms.map((term) => term.trim().toLowerCase()).filter((term) => term.length > 0),
  );

/**
 * Perfil de busca do usuário: o que ele procura numa vaga.
 * É a entrada do motor de scoring (o "alvo" contra o qual as vagas são medidas).
 */
export const profileSchema = z.object({
  /** Tecnologias desejadas (ex.: "typescript", "node"). */
  stack: termList,
  /** Senioridade desejada (null = indiferente). */
  seniority: z.enum(['junior', 'mid', 'senior']).nullable().default(null),
  /** Palavras-chave que agregam relevância. */
  keywords: termList,
  /** Preferência por vagas remotas. */
  remote: z.boolean().default(true),
});

export type Profile = z.infer<typeof profileSchema>;

/** Perfil padrão (vazio): usado quando não há profile.json configurado. */
export const defaultProfile: Profile = profileSchema.parse({});

/**
 * Carrega o perfil de `profile.json` (caminho configurável via PROFILE_PATH).
 * Se o arquivo não existir, cai no perfil padrão. Valida com o schema.
 */
export function loadProfile(): Profile {
  const path = process.env['PROFILE_PATH'] ?? 'profile.json';

  if (!existsSync(path)) {
    logger.warn({ path }, 'profile.json não encontrado; usando perfil padrão');
    return defaultProfile;
  }

  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return profileSchema.parse(raw);
}
