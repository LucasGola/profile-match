import { afterEach, describe, expect, it } from 'vitest';
import { defaultProfile, loadProfile, profileSchema } from './profile.js';

describe('profileSchema', () => {
  it('aplica defaults para campos ausentes', () => {
    expect(profileSchema.parse({})).toEqual({
      stack: [],
      seniority: null,
      keywords: [],
      remote: true,
    });
  });

  it('normaliza stack/keywords (trim + minúsculas)', () => {
    const profile = profileSchema.parse({ stack: ['  TypeScript ', 'NODE'], keywords: ['API'] });
    expect(profile.stack).toEqual(['typescript', 'node']);
    expect(profile.keywords).toEqual(['api']);
  });

  it('rejeita senioridade inválida', () => {
    expect(() => profileSchema.parse({ seniority: 'staff' })).toThrow();
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
