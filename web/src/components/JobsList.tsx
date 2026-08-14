import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Job } from '../types';

function scoreClass(score: number | null): string {
  if (score === null) return 'score score-na';
  if (score >= 80) return 'score score-high';
  if (score >= 50) return 'score score-mid';
  return 'score score-low';
}

export function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Arrastar o slider ou digitar atualiza minScore na hora (UI responsiva), mas
  // a busca só dispara ~300ms depois da última mudança. Sem isso, cada tique do
  // slider refazia a chamada à API e a lista ficava piscando ("sensível").
  useEffect(() => {
    let active = true;
    const handle = setTimeout(() => {
      setLoading(true);
      api
        .getJobs({ minScore: minScore || undefined, pageSize: 50 })
        .then((res) => {
          if (!active) return;
          setJobs(res.data);
          setTotal(res.total);
          setError(null);
        })
        .catch((e: unknown) => {
          if (active) setError(e instanceof Error ? e.message : 'erro ao carregar');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [minScore]);

  const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  return (
    <section>
      <div className="controls">
        <div className="slider">
          <span>Score mínimo</span>
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
            }}
          />
          <input
            type="number"
            className="score-input"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => {
              const raw = e.target.value;
              setMinScore(raw === '' ? 0 : clampScore(Number(raw)));
            }}
          />
        </div>
        <span className="muted">{total} vaga(s)</span>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Carregando…</p>
      ) : (
        <ul className="jobs">
          {jobs.map((job) => (
            <li key={job.id} className="job">
              <button
                className="job-head"
                onClick={() => {
                  setExpanded(expanded === job.id ? null : job.id);
                }}
              >
                <span className={scoreClass(job.score)}>{job.score ?? '—'}</span>
                <span className="job-title">{job.title}</span>
                <span className="job-company">{job.company}</span>
              </button>

              {expanded === job.id && (
                <div className="job-detail">
                  {job.location && <p className="muted">{job.location}</p>}
                  <table className="breakdown">
                    <tbody>
                      {(job.scoreBreakdown ?? []).map((b) => (
                        <tr key={b.criterion}>
                          <td className="crit">{b.criterion}</td>
                          <td className="detail">{b.detail}</td>
                          <td className="bar-cell">
                            <div className="bar-track">
                              <div
                                className="bar-fill"
                                style={{ width: `${String(Math.round(b.score * 100))}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <a href={job.url} target="_blank" rel="noreferrer">
                    Abrir vaga →
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
