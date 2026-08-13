import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import type { Stats } from '../types';

const COLORS = ['#e2603b', '#e2b93b', '#c9cf3b', '#57b85b', '#22a06b'];
const FALLBACK = '#5b8def';

export function Analytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getStats()
      .then((s) => {
        if (active) setStats(s);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'erro ao carregar');
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Carregando…</p>;

  return (
    <section className="analytics">
      <div className="tiles">
        <div className="tile">
          <span className="tile-value">{stats.total}</span>
          <span className="tile-label">vagas coletadas</span>
        </div>
        <div className="tile">
          <span className="tile-value">{stats.notified}</span>
          <span className="tile-label">notificadas</span>
        </div>
      </div>

      <div className="chart">
        <h3>Vagas por faixa de score</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.byScoreBucket}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="bucket" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {stats.byScoreBucket.map((entry, i) => (
                <Cell key={entry.bucket} fill={COLORS[i % COLORS.length] ?? FALLBACK} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart">
        <h3>Vagas por fonte</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.bySource} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="source" width={100} />
            <Tooltip />
            <Bar dataKey="count" fill={FALLBACK} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart">
        <h3>Vagas vistas por dia</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.byDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#22a06b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
