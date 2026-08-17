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

describe('CORS', () => {
  it('reflete a origem na resposta', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5173' },
    });

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('permite PUT no preflight (necessário para salvar o perfil)', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/profile',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('PUT');
  });
});

describe('OpenAPI (Swagger)', () => {
  it('expõe o spec com as rotas de vagas', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/json' });

    expect(response.statusCode).toBe(200);
    const spec = response.json<{ openapi: string; paths: Record<string, unknown> }>();
    expect(spec.openapi).toBeDefined();
    expect(Object.keys(spec.paths)).toContain('/jobs');
    expect(Object.keys(spec.paths)).toContain('/sources');
  });
});
