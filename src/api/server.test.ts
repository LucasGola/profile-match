import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './server.js';

const app = buildApp();

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('retorna 200 com status ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
