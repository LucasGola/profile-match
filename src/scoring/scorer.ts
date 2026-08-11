import Fuse from 'fuse.js';
import type { NormalizedJob } from '../pipeline/job.schema.js';
import type { Profile } from './profile.js';

export type Criterion = 'stack' | 'seniority' | 'remote' | 'keywords';

export interface ScoreWeights {
  stack: number;
  seniority: number;
  remote: number;
  keywords: number;
}

/** Pesos default: stack domina; keywords é o desempate mais fraco. */
export const defaultWeights: ScoreWeights = {
  stack: 5,
  seniority: 2,
  remote: 2,
  keywords: 1,
};

export interface BreakdownItem {
  criterion: Criterion;
  /** Aderência do critério, 0..1. */
  score: number;
  weight: number;
  /** score × weight. */
  contribution: number;
  /** Explicação legível de por que o critério bateu (ou não). */
  detail: string;
}

export interface ScoreResult {
  /** Aderência geral normalizada, 0..100. */
  score: number;
  breakdown: BreakdownItem[];
}

/** Vaga normalizada já com score e breakdown, pronta para persistir. */
export interface ScoredJob extends NormalizedJob {
  score: number;
  scoreBreakdown: BreakdownItem[];
}

/** Divide o texto em tokens, preservando símbolos comuns de tech (+, #, .). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length > 0);
}

/**
 * Retorna quais dos `terms` aparecem no `text`, com tolerância a variação
 * (fuse.js): "node" casa "node.js", "postgres" casa "postgresql".
 */
export function matchTerms(terms: string[], text: string): string[] {
  if (terms.length === 0) return [];
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  const fuse = new Fuse(tokens, { threshold: 0.3, ignoreLocation: true });
  return terms.filter((term) => fuse.search(term).length > 0);
}

/** Detecta a senioridade no texto da vaga (null = não identificada). */
export function detectSeniority(text: string): 'junior' | 'mid' | 'senior' | null {
  const t = text.toLowerCase();
  if (/\b(senior|sênior|sr\.?|lead|staff|principal)\b/.test(t)) return 'senior';
  if (/\b(junior|júnior|jr\.?|intern|trainee|estágio|estagi)\b/.test(t)) return 'junior';
  if (/\b(pleno|mid|mid-level|intermediate|intermediário)\b/.test(t)) return 'mid';
  return null;
}

/** Detecta se a vaga é remota a partir do texto. */
export function detectRemote(text: string): boolean {
  return /\b(remote|remoto|anywhere|worldwide|home[\s-]?office|distributed|híbrido|hybrid)\b/.test(
    text.toLowerCase(),
  );
}

/**
 * Pontua a aderência de uma vaga ao perfil, de 0 a 100, com um breakdown
 * explicável por critério.
 *
 * Cada critério só entra no cálculo se for aplicável (o perfil o especifica).
 * O score final é a média ponderada das aderências pelos pesos aplicáveis.
 */
export function scoreJob(
  job: NormalizedJob,
  profile: Profile,
  weights: ScoreWeights = defaultWeights,
): ScoreResult {
  const text = [job.title, job.description ?? '', job.location ?? ''].join(' ');
  const breakdown: BreakdownItem[] = [];

  const push = (criterion: Criterion, score: number, weight: number, detail: string): void => {
    breakdown.push({ criterion, score, weight, contribution: score * weight, detail });
  };

  if (profile.stack.length > 0) {
    const matched = matchTerms(profile.stack, text);
    const score = matched.length / profile.stack.length;
    push(
      'stack',
      score,
      weights.stack,
      `${String(matched.length)}/${String(profile.stack.length)} techs${matched.length > 0 ? `: ${matched.join(', ')}` : ''}`,
    );
  }

  if (profile.keywords.length > 0) {
    const matched = matchTerms(profile.keywords, text);
    const score = matched.length / profile.keywords.length;
    push(
      'keywords',
      score,
      weights.keywords,
      `${String(matched.length)}/${String(profile.keywords.length)} keywords${matched.length > 0 ? `: ${matched.join(', ')}` : ''}`,
    );
  }

  if (profile.seniority !== null) {
    const detected = detectSeniority(text);
    // Desconhecida é neutra (0.5) para não penalizar vagas sem senioridade explícita.
    const score = detected === null ? 0.5 : detected === profile.seniority ? 1 : 0;
    push(
      'seniority',
      score,
      weights.seniority,
      `perfil: ${profile.seniority}; vaga: ${detected ?? 'n/d'}`,
    );
  }

  const jobRemote = detectRemote(text);
  push(
    'remote',
    jobRemote === profile.remote ? 1 : 0,
    weights.remote,
    `perfil: ${profile.remote ? 'remoto' : 'presencial'}; vaga: ${jobRemote ? 'remoto' : 'presencial/n-d'}`,
  );

  const totalWeight = breakdown.reduce((acc, item) => acc + item.weight, 0);
  const totalContribution = breakdown.reduce((acc, item) => acc + item.contribution, 0);
  const score = totalWeight === 0 ? 0 : Math.round((totalContribution / totalWeight) * 100);

  return { score, breakdown };
}
