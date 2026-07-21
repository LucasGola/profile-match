import { describe, expect, it } from 'vitest';
import { COLLECTION_JOB_OPTIONS } from './job-options.js';

describe('COLLECTION_JOB_OPTIONS', () => {
  it('reexecuta o job com múltiplas tentativas', () => {
    expect(COLLECTION_JOB_OPTIONS.attempts ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('usa backoff exponencial com delay positivo', () => {
    const { backoff } = COLLECTION_JOB_OPTIONS;
    expect(backoff).toMatchObject({ type: 'exponential' });
    if (typeof backoff === 'object') {
      expect(backoff.delay ?? 0).toBeGreaterThan(0);
    }
  });

  it('limita a retenção de jobs concluídos e falhos (evita crescer o Redis)', () => {
    expect(COLLECTION_JOB_OPTIONS.removeOnComplete).toBeDefined();
    expect(COLLECTION_JOB_OPTIONS.removeOnFail).toBeDefined();
  });
});
