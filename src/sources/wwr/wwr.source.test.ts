import { describe, expect, it } from 'vitest';
import { WwrSource } from './wwr.source.js';

describe('WwrSource.normalize', () => {
  const source = new WwrSource();

  it('separa "Empresa: Cargo" do título e mapeia region/description', () => {
    const [job] = source.normalize([
      {
        title: 'Coinbase: Product Marketing Manager',
        link: 'https://weworkremotely.com/remote-jobs/coinbase-pmm',
        region: 'Anywhere in the World',
        contentSnippet: 'Headquarters: Remote - USA',
      },
    ]);

    expect(job).toEqual({
      title: 'Product Marketing Manager',
      company: 'Coinbase',
      url: 'https://weworkremotely.com/remote-jobs/coinbase-pmm',
      location: 'Anywhere in the World',
      description: 'Headquarters: Remote - USA',
    });
  });

  it('descarta item sem separador de empresa no título', () => {
    const jobs = source.normalize([
      { title: 'Sem separador de empresa', link: 'https://weworkremotely.com/x' },
    ]);
    expect(jobs).toHaveLength(0);
  });

  it('normaliza region/description ausentes para null', () => {
    const [job] = source.normalize([
      { title: 'Acme: Dev', link: 'https://weworkremotely.com/remote-jobs/acme-dev' },
    ]);
    expect(job?.location).toBeNull();
    expect(job?.description).toBeNull();
  });
});
