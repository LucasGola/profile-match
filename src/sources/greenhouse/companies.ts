export interface GreenhouseCompany {
  /** Nome legível da empresa. */
  name: string;
  /** Token do board público no Greenhouse: boards-api.../boards/{token}/jobs */
  boardToken: string;
}

/**
 * Empresas cujos boards do Greenhouse são coletados.
 *
 * Lista FIXA das maiores empresas de tecnologia do Brasil (decisão consciente).
 * Parte delas usa Gupy/portal próprio e NÃO tem board no Greenhouse (retorna
 * 404) — a coleta isola cada board e ignora os que falham. Tokens verificados
 * em 2026-07-22 que retornam vagas: stone, c6bank, gympass, quintoandar, vtex;
 * nubank existe mas está com 0 vagas; os demais retornam 404.
 *
 * SEAM (extensão futura): esta lista é fixa hoje. Um método de descoberta/
 * inferência de empresas pode, no futuro, substituir esta constante SEM alterar
 * o GreenhouseSource — ele apenas consome esta lista (ou uma injetada no
 * construtor). Ver o parâmetro `companies` de GreenhouseSource.
 */
export const greenhouseCompanies: GreenhouseCompany[] = [
  { name: 'Nubank', boardToken: 'nubank' },
  { name: 'Stone', boardToken: 'stone' },
  { name: 'iFood', boardToken: 'ifood' },
  { name: 'Mercado Livre', boardToken: 'mercadolivre' },
  { name: 'VTEX', boardToken: 'vtex' },
  { name: 'TOTVS', boardToken: 'totvs' },
  { name: 'C6 Bank', boardToken: 'c6bank' },
  { name: 'QuintoAndar', boardToken: 'quintoandar' },
  { name: 'Wellhub (Gympass)', boardToken: 'gympass' },
  { name: 'PagBank', boardToken: 'pagseguro' },
];
