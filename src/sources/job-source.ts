import type { NormalizedJob } from '../pipeline/job.schema.js';

/**
 * Contrato comum a todas as fontes de vagas.
 *
 * Cada fonte encapsula seu próprio protocolo (API JSON, RSS, etc.) e é
 * responsável por buscar e normalizar suas vagas para o schema canônico.
 * Adicionar uma nova fonte = implementar esta interface e registrá-la no
 * registry — sem tocar no resto do sistema.
 */
export interface JobSource {
  /** Identificador estável usado no banco e nos logs (ex.: "remotive"). */
  readonly slug: string;

  /** Nome legível da fonte (ex.: "Remotive"). */
  readonly name: string;

  /**
   * Busca e normaliza as vagas da fonte.
   *
   * Deve lançar em caso de falha de coleta (rede, formato inesperado);
   * o isolamento entre fontes é responsabilidade de quem orquestra a coleta.
   */
  fetch(): Promise<NormalizedJob[]>;
}
