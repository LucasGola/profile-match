import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GreenhouseCompany } from './companies.js';
import { GreenhouseSource } from './greenhouse.source.js';

const company: GreenhouseCompany = { name: 'VTEX', boardToken: 'vtex' };

describe('GreenhouseSource.normalize', () => {
  const source = new GreenhouseSource();

  it('mapeia os campos da vaga usando company_name e location.name', () => {
    const [job] = source.normalize(
      [
        {
          title: 'Senior Backend Engineer',
          absolute_url: 'https://job-boards.greenhouse.io/vtex/jobs/1',
          company_name: 'VTEX',
          location: { name: 'São Paulo' },
        },
      ],
      company,
    );

    expect(job).toEqual({
      title: 'Senior Backend Engineer',
      company: 'VTEX',
      url: 'https://job-boards.greenhouse.io/vtex/jobs/1',
      location: 'São Paulo',
      description: null,
    });
  });

  it('usa o nome do config quando company_name está ausente', () => {
    const [job] = source.normalize(
      [{ title: 'Dev', absolute_url: 'https://job-boards.greenhouse.io/vtex/jobs/2' }],
      company,
    );
    expect(job?.company).toBe('VTEX');
    expect(job?.location).toBeNull();
  });

  it('descarta vaga sem url', () => {
    const jobs = source.normalize([{ title: 'Sem URL', company_name: 'VTEX' }], company);
    expect(jobs).toHaveLength(0);
  });
});

describe('GreenhouseSource.fetch (isolamento por board)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('um board que falha (404) não impede os demais', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : '';
      if (url.includes('/ok/')) {
        const payload = {
          jobs: [
            {
              title: 'Dev',
              absolute_url: 'https://job-boards.greenhouse.io/ok/jobs/1',
              company_name: 'OK Corp',
            },
          ],
        };
        return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    });

    const source = new GreenhouseSource({
      companies: [
        { name: 'Falha', boardToken: 'falha' },
        { name: 'OK Corp', boardToken: 'ok' },
      ],
    });

    const jobs = await source.fetch();

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.company).toBe('OK Corp');
  });
});
