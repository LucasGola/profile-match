import { prisma } from '../db/client.js';
import type { Profile } from '../scoring/profile.js';
import { scoreJob } from '../scoring/scorer.js';
import type { Prisma } from '../generated/prisma/client.js';

/**
 * Re-pontua todas as vagas persistidas com o perfil informado.
 *
 * Usado quando o perfil muda (ex.: edição pela UI): o score refletido no
 * histórico passa a valer para o perfil atual, sem esperar uma nova coleta.
 *
 * @returns quantidade de vagas re-pontuadas.
 */
export async function rescoreAllJobs(profile: Profile): Promise<number> {
  const jobs = await prisma.job.findMany({
    select: { id: true, title: true, company: true, url: true, location: true, description: true },
  });

  for (const job of jobs) {
    const { score, breakdown } = scoreJob(job, profile);
    await prisma.job.update({
      where: { id: job.id },
      data: { score, scoreBreakdown: breakdown as unknown as Prisma.InputJsonValue },
    });
  }

  return jobs.length;
}
