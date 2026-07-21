import { describe, expect, it } from 'vitest';
import { RemotiveSource } from './remotive.source.js';

describe('RemotiveSource.normalize', () => {
  const source = new RemotiveSource();

  it('mapeia os campos da API para o schema canônico', () => {
    const [job] = source.normalize([
      {
        title: 'Backend Dev',
        company_name: 'Acme',
        url: 'https://remotive.com/1',
        candidate_required_location: 'Worldwide',
        description: 'uma descrição',
      },
    ]);

    expect(job).toEqual({
      title: 'Backend Dev',
      company: 'Acme',
      url: 'https://remotive.com/1',
      location: 'Worldwide',
      description: 'uma descrição',
    });
  });

  it('descarta vagas inválidas sem lançar (ex.: sem url)', () => {
    const jobs = source.normalize([
      { title: 'Sem URL', company_name: 'Acme' },
      { title: 'Válida', company_name: 'Acme', url: 'https://remotive.com/2' },
    ]);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.url).toBe('https://remotive.com/2');
  });

  it('normaliza location/description ausentes para null', () => {
    const [job] = source.normalize([
      { title: 'Válida', company_name: 'Acme', url: 'https://remotive.com/3' },
    ]);

    expect(job?.location).toBeNull();
    expect(job?.description).toBeNull();
  });
});
