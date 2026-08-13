import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../scoring/profile.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../scoring/profile.js')>()),
  loadProfile: vi.fn(),
  saveProfile: vi.fn(),
}));
vi.mock('../../pipeline/rescore.js', () => ({
  rescoreAllJobs: vi.fn(),
}));

import { rescoreAllJobs } from '../../pipeline/rescore.js';
import { loadProfile, profileSchema, saveProfile } from '../../scoring/profile.js';
import { buildApp } from '../server.js';

const mockLoadProfile = vi.mocked(loadProfile);
const mockSaveProfile = vi.mocked(saveProfile);
const mockRescore = vi.mocked(rescoreAllJobs);

const app = buildApp();

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /profile', () => {
  it('retorna o perfil atual', async () => {
    mockLoadProfile.mockReturnValue(profileSchema.parse({ stack: ['node'] }));

    const response = await app.inject({ method: 'GET', url: '/profile' });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ stack: string[] }>().stack).toEqual(['node']);
  });
});

describe('PUT /profile', () => {
  it('valida, salva e re-pontua, retornando o perfil e a contagem', async () => {
    mockRescore.mockResolvedValue(7);

    const response = await app.inject({
      method: 'PUT',
      url: '/profile',
      payload: { stack: ['Node'], seniority: 'senior', keywords: ['api'] },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ profile: { stack: string[] }; rescored: number }>();
    expect(body.rescored).toBe(7);
    expect(body.profile.stack).toEqual(['node']); // normalizado
    expect(mockSaveProfile).toHaveBeenCalledOnce();
    expect(mockRescore).toHaveBeenCalledOnce();
  });

  it('rejeita perfil inválido com 400 (sem salvar nem re-pontuar)', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/profile',
      payload: { seniority: 'staff' },
    });

    expect(response.statusCode).toBe(400);
    expect(mockSaveProfile).not.toHaveBeenCalled();
    expect(mockRescore).not.toHaveBeenCalled();
  });
});
