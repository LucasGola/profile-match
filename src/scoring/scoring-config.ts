/**
 * Tipos e valores default da configuração de scoring.
 *
 * Ficam num módulo próprio (sem dependências) para serem compartilhados entre
 * o schema do perfil (`profile.ts`) e o motor (`scorer.ts`) sem ciclo.
 */

export interface ScoreWeights {
  stack: number;
  seniority: number;
  remote: number;
  keywords: number;
}

export interface SeniorityTerms {
  senior: string[];
  mid: string[];
  junior: string[];
}

export interface MatchingConfig {
  /** Tolerância do fuzzy match (fuse.js): 0 = exato, 1 = qualquer coisa. */
  fuzzyThreshold: number;
  /** Nota (0..1) quando a senioridade da vaga não é identificada. */
  unknownSeniorityScore: number;
  /** Termos que identificam cada nível de senioridade no texto. */
  seniorityTerms: SeniorityTerms;
  /** Termos que identificam uma vaga remota. */
  remoteTerms: string[];
}

/** Pesos default: stack domina; keywords é o desempate mais fraco. */
export const DEFAULT_WEIGHTS: ScoreWeights = {
  stack: 5,
  seniority: 2,
  remote: 2,
  keywords: 1,
};

export const DEFAULT_SENIORITY_TERMS: SeniorityTerms = {
  senior: ['senior', 'sênior', 'sr', 'lead', 'staff', 'principal'],
  mid: ['pleno', 'mid', 'mid-level', 'intermediate', 'intermediário'],
  junior: ['junior', 'júnior', 'jr', 'intern', 'trainee', 'estágio', 'estagi'],
};

export const DEFAULT_REMOTE_TERMS: string[] = [
  'remote',
  'remoto',
  'anywhere',
  'worldwide',
  'home office',
  'home-office',
  'distributed',
  'híbrido',
  'hybrid',
];

export const DEFAULT_MATCHING: MatchingConfig = {
  fuzzyThreshold: 0.3,
  unknownSeniorityScore: 0.5,
  seniorityTerms: DEFAULT_SENIORITY_TERMS,
  remoteTerms: DEFAULT_REMOTE_TERMS,
};
