import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { logger } from '../logger.js';
import {
  DEFAULT_MATCHING,
  DEFAULT_REMOTE_TERMS,
  DEFAULT_SENIORITY_TERMS,
  DEFAULT_WEIGHTS,
} from './scoring-config.js';

/** Normaliza termos: trim + minúsculas, sem vazios. */
function normalizeTerms(terms: string[]): string[] {
  return terms.map((term) => term.trim().toLowerCase()).filter((term) => term.length > 0);
}

/** Lista de termos com um default (aplicado quando ausente). */
function termList(defaultTerms: string[] = []) {
  return z.array(z.string()).default(defaultTerms).transform(normalizeTerms);
}

/** Pesos dos critérios (cada campo tem default). */
const weightsSchema = z.object({
  stack: z.number().nonnegative().default(DEFAULT_WEIGHTS.stack),
  seniority: z.number().nonnegative().default(DEFAULT_WEIGHTS.seniority),
  remote: z.number().nonnegative().default(DEFAULT_WEIGHTS.remote),
  keywords: z.number().nonnegative().default(DEFAULT_WEIGHTS.keywords),
});

/** Termos de senioridade por nível. */
const seniorityTermsSchema = z.object({
  senior: termList(DEFAULT_SENIORITY_TERMS.senior),
  mid: termList(DEFAULT_SENIORITY_TERMS.mid),
  junior: termList(DEFAULT_SENIORITY_TERMS.junior),
});

/** Parâmetros de matching (detecção e fuzzy). */
const matchingSchema = z.object({
  fuzzyThreshold: z.number().min(0).max(1).default(DEFAULT_MATCHING.fuzzyThreshold),
  unknownSeniorityScore: z.number().min(0).max(1).default(DEFAULT_MATCHING.unknownSeniorityScore),
  seniorityTerms: seniorityTermsSchema.default(() => seniorityTermsSchema.parse({})),
  remoteTerms: termList(DEFAULT_REMOTE_TERMS),
});

/**
 * Perfil de busca do usuário: o que ele procura numa vaga E como as vagas são
 * pontuadas. Tudo é configurável via `profile.json`; campos ausentes usam os
 * defaults.
 */
export const profileSchema = z.object({
  /** Tecnologias desejadas (ex.: "typescript", "node"). */
  stack: termList(),
  /** Senioridade desejada (null = indiferente). */
  seniority: z.enum(['junior', 'mid', 'senior']).nullable().default(null),
  /** Palavras-chave que agregam relevância. */
  keywords: termList(),
  /** Preferência por vagas remotas. */
  remote: z.boolean().default(true),
  /** Pesos de cada critério no score. */
  weights: weightsSchema.default(() => weightsSchema.parse({})),
  /** Regras de detecção e fuzzy. */
  matching: matchingSchema.default(() => matchingSchema.parse({})),
});

export type Profile = z.infer<typeof profileSchema>;

/** Perfil padrão: usado quando não há profile.json configurado. */
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
