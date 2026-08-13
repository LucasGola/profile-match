import Fuse from 'fuse.js';
import type { NormalizedJob } from '../pipeline/job.schema.js';
import type { Profile } from './profile.js';
import {
  DEFAULT_MATCHING,
  DEFAULT_REMOTE_TERMS,
  DEFAULT_SENIORITY_TERMS,
  type SeniorityTerms,
} from './scoring-config.js';

export type Criterion = 'stack' | 'seniority' | 'remote' | 'keywords';

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
export function matchTerms(
  terms: string[],
  text: string,
  threshold: number = DEFAULT_MATCHING.fuzzyThreshold,
): string[] {
  if (terms.length === 0) return [];
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  const fuse = new Fuse(tokens, { threshold, ignoreLocation: true });
  return terms.filter((term) => fuse.search(term).length > 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Verifica se algum dos `terms` aparece no texto (como palavra). */
function containsAnyTerm(loweredText: string, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const pattern = new RegExp(`\\b(${terms.map(escapeRegExp).join('|')})\\b`);
  return pattern.test(loweredText);
}

/** Detecta a senioridade no texto da vaga (null = não identificada). */
export function detectSeniority(
  text: string,
  terms: SeniorityTerms = DEFAULT_SENIORITY_TERMS,
): 'junior' | 'mid' | 'senior' | null {
  const lowered = text.toLowerCase();
  // Prioridade: senior > mid > junior (o mais alto vence em caso de ambiguidade).
  if (containsAnyTerm(lowered, terms.senior)) return 'senior';
  if (containsAnyTerm(lowered, terms.mid)) return 'mid';
  if (containsAnyTerm(lowered, terms.junior)) return 'junior';
  return null;
}

/** Detecta se a vaga é remota a partir do texto. */
export function detectRemote(text: string, terms: string[] = DEFAULT_REMOTE_TERMS): boolean {
  return containsAnyTerm(text.toLowerCase(), terms);
}

/**
 * Pontua a aderência de uma vaga ao perfil, de 0 a 100, com um breakdown
 * explicável por critério.
 *
 * Cada critério só entra no cálculo se for aplicável (o perfil o especifica).
 * O score final é a média ponderada das aderências pelos pesos aplicáveis.
 * Pesos e regras de detecção vêm do próprio perfil (`profile.weights` e
 * `profile.matching`).
 */
export function scoreJob(job: NormalizedJob, profile: Profile): ScoreResult {
  const { weights, matching } = profile;
  const text = [job.title, job.description ?? '', job.location ?? ''].join(' ');
  const breakdown: BreakdownItem[] = [];

  const push = (criterion: Criterion, score: number, weight: number, detail: string): void => {
    breakdown.push({ criterion, score, weight, contribution: score * weight, detail });
  };

  if (profile.stack.length > 0) {
    const matched = matchTerms(profile.stack, text, matching.fuzzyThreshold);
    const score = matched.length / profile.stack.length;
    push(
      'stack',
      score,
      weights.stack,
      `${String(matched.length)}/${String(profile.stack.length)} techs${matched.length > 0 ? `: ${matched.join(', ')}` : ''}`,
    );
  }

  if (profile.keywords.length > 0) {
    const matched = matchTerms(profile.keywords, text, matching.fuzzyThreshold);
    const score = matched.length / profile.keywords.length;
    push(
      'keywords',
      score,
      weights.keywords,
      `${String(matched.length)}/${String(profile.keywords.length)} keywords${matched.length > 0 ? `: ${matched.join(', ')}` : ''}`,
    );
  }

  if (profile.seniority !== null) {
    const detected = detectSeniority(text, matching.seniorityTerms);
    const score =
      detected === null ? matching.unknownSeniorityScore : detected === profile.seniority ? 1 : 0;
    push(
      'seniority',
      score,
      weights.seniority,
      `perfil: ${profile.seniority}; vaga: ${detected ?? 'n/d'}`,
    );
  }

  const jobRemote = detectRemote(text, matching.remoteTerms);
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
