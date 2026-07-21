import { describe, expect, it } from 'vitest';
import { computeDedupeHash } from './dedupe.js';

describe('computeDedupeHash', () => {
  const base = { company: 'Acme', title: 'Backend Dev', url: 'https://x.com/1' };

  it('é estável para a mesma entrada', () => {
    expect(computeDedupeHash(base)).toBe(computeDedupeHash(base));
  });

  it('ignora diferença de caixa e espaços redundantes', () => {
    const variant = { company: '  ACME  ', title: 'backend   dev', url: 'https://x.com/1' };
    expect(computeDedupeHash(variant)).toBe(computeDedupeHash(base));
  });

  it('difere quando a url muda', () => {
    expect(computeDedupeHash(base)).not.toBe(
      computeDedupeHash({ ...base, url: 'https://x.com/2' }),
    );
  });

  it('não colide ao deslocar o limite entre campos (separador NUL)', () => {
    const a = computeDedupeHash({ company: 'ab', title: 'c', url: 'https://x.com' });
    const b = computeDedupeHash({ company: 'a', title: 'bc', url: 'https://x.com' });
    expect(a).not.toBe(b);
  });
});
