import type { JobSource } from './job-source.js';
import { RemotiveSource } from './remotive/remotive.source.js';

/**
 * Registry das fontes habilitadas.
 *
 * Adicionar uma nova fonte = implementar `JobSource` e incluí-la nesta lista.
 * Nenhum outro ponto do sistema precisa ser alterado.
 */
export const sources: JobSource[] = [new RemotiveSource()];
