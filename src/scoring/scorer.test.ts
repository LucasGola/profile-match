import { describe, expect, it } from 'vitest';
import type { NormalizedJob } from '../pipeline/job.schema.js';
import type { Profile } from './profile.js';
import { detectRemote, detectSeniority, matchTerms, scoreJob } from './scorer.js';

describe('matchTerms', () => {
  it('casa termos com variação (node↔node.js, postgres↔postgresql)', () => {
    const text = 'Senior Node.js engineer with PostgreSQL and TypeScript';
    expect(matchTerms(['node', 'postgres', 'typescript'], text).sort()).toEqual([
      'node',
      'postgres',
      'typescript',
    ]);
  });

  it('não casa termos ausentes', () => {
    expect(matchTerms(['python', 'rust'], 'Node.js backend role')).toEqual([]);
  });
});

describe('detectSeniority', () => {
  it.each([
    ['Senior Backend Engineer', 'senior'],
    ['Staff Software Engineer', 'senior'],
    ['Junior Developer', 'junior'],
    ['Desenvolvedor Pleno', 'mid'],
    ['Software Engineer', null],
  ] as const)('detecta "%s" como %s', (title, expected) => {
    expect(detectSeniority(title)).toBe(expected);
  });
});

describe('detectRemote', () => {
  it('detecta vaga remota', () => {
    expect(detectRemote('Backend Engineer — Remote, Anywhere')).toBe(true);
  });
  it('não marca remoto quando não indicado', () => {
    expect(detectRemote('Backend Engineer, São Paulo office')).toBe(false);
  });
});

describe('scoreJob', () => {
  const profile: Profile = {
    stack: ['node', 'postgres', 'typescript'],
    seniority: 'senior',
    keywords: ['backend'],
    remote: true,
  };

  const strongJob: NormalizedJob = {
    title: 'Senior Node.js Backend Engineer (Remote)',
    company: 'Acme',
    url: 'https://x.com/1',
    location: 'Anywhere in the World',
    description: 'We use PostgreSQL and TypeScript.',
  };

  it('pontua alto uma vaga muito aderente', () => {
    const { score, breakdown } = scoreJob(strongJob, profile);
    expect(score).toBeGreaterThan(80);
    expect(breakdown.find((b) => b.criterion === 'stack')?.score).toBe(1);
  });

  it('pontua baixo uma vaga não aderente', () => {
    const weakJob: NormalizedJob = {
      title: 'Junior Marketing Assistant',
      company: 'Acme',
      url: 'https://x.com/2',
      location: 'São Paulo',
      description: 'Sales and marketing role.',
    };
    expect(scoreJob(weakJob, profile).score).toBeLessThan(30);
  });

  it('score fica em 0..100 e contribuição = score × peso', () => {
    const { score, breakdown } = scoreJob(strongJob, profile);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    for (const item of breakdown) {
      expect(item.contribution).toBeCloseTo(item.score * item.weight);
    }
  });

  it('critério não aplicável (perfil sem keywords) fica fora do breakdown', () => {
    const { breakdown } = scoreJob(strongJob, { ...profile, keywords: [] });
    expect(breakdown.some((b) => b.criterion === 'keywords')).toBe(false);
  });
});
