import { describe, expect, it } from 'vitest';
import { getSourceBySlug, sources } from './registry.js';

describe('registry', () => {
  it('inclui a fonte Remotive', () => {
    expect(sources.some((s) => s.slug === 'remotive')).toBe(true);
  });

  it('resolve uma fonte existente pelo slug', () => {
    const source = getSourceBySlug('remotive');
    expect(source?.name).toBe('Remotive');
  });

  it('retorna undefined para slug desconhecido', () => {
    expect(getSourceBySlug('inexistente')).toBeUndefined();
  });
});
