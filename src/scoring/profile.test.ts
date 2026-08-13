import { afterEach, describe, expect, it } from 'vitest';
import { defaultProfile, loadProfile, profileSchema } from './profile.js';
import { DEFAULT_MATCHING, DEFAULT_WEIGHTS } from './scoring-config.js';

describe('profileSchema', () => {
  it('aplica defaults para campos ausentes', () => {
    const profile = profileSchema.parse({});
    expect(profile).toMatchObject({ stack: [], seniority: null, keywords: [], remote: true });
    expect(profile.weights).toEqual(DEFAULT_WEIGHTS);
    expect(profile.matching.fuzzyThreshold).toBe(DEFAULT_MATCHING.fuzzyThreshold);
    expect(profile.matching.remoteTerms).toEqual(DEFAULT_MATCHING.remoteTerms);
  });

  it('normaliza stack/keywords (trim + minúsculas)', () => {
    const profile = profileSchema.parse({ stack: ['  TypeScript ', 'NODE'], keywords: ['API'] });
    expect(profile.stack).toEqual(['typescript', 'node']);
    expect(profile.keywords).toEqual(['api']);
  });

  it('rejeita senioridade inválida', () => {
    expect(() => profileSchema.parse({ seniority: 'staff' })).toThrow();
  });

  it('aceita weights parciais, preenchendo os demais com default', () => {
    const profile = profileSchema.parse({ weights: { stack: 10 } });
    expect(profile.weights.stack).toBe(10);
    expect(profile.weights.keywords).toBe(DEFAULT_WEIGHTS.keywords);
  });

  it('aceita matching customizado (threshold e termos)', () => {
    const profile = profileSchema.parse({
      matching: { fuzzyThreshold: 0.1, remoteTerms: ['Teletrabalho'] },
    });
    expect(profile.matching.fuzzyThreshold).toBe(0.1);
    expect(profile.matching.remoteTerms).toEqual(['teletrabalho']);
    // termo não informado herda o default:
    expect(profile.matching.seniorityTerms.senior).toContain('senior');
  });

  it('rejeita fuzzyThreshold fora de 0..1', () => {
    expect(() => profileSchema.parse({ matching: { fuzzyThreshold: 2 } })).toThrow();
  });
});

describe('loadProfile', () => {
  const original = process.env['PROFILE_PATH'];
  afterEach(() => {
    if (original === undefined) delete process.env['PROFILE_PATH'];
    else process.env['PROFILE_PATH'] = original;
  });

  it('usa o perfil padrão quando o arquivo não existe', () => {
    process.env['PROFILE_PATH'] = 'nao-existe-xyz-123.json';
    expect(loadProfile()).toEqual(defaultProfile);
  });

  it('carrega e valida o profile.example.json', () => {
    process.env['PROFILE_PATH'] = 'profile.example.json';
    const profile = loadProfile();
    expect(profile.stack.length).toBeGreaterThan(0);
  });
});
