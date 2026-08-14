import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import type { Stats } from '../types';

// Rampa semântica de "qualidade do match": neutro → âmbar → verde.
const SCORE_COLORS = ['#c2c7d0', '#e6c15a', '#e0a100', '#5cb85c', '#0ca30c'];
const ACCENT = '#2a78d6';
const AXIS = '#8a909c';
const GRID = '#eef0f3';

const tickStyle = { fontSize: 12, fill: AXIS } as const;
const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid rgba(17,20,28,0.1)',
  boxShadow: '0 6px 16px rgba(16,24,40,0.08)',
  fontSize: 13,
} as const;

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
          <span className="tile-value">{stats.total.toLocaleString('pt-BR')}</span>
          <span className="tile-label">vagas coletadas</span>
        </div>
        <div className="tile">
          <span className="tile-value">{stats.notified.toLocaleString('pt-BR')}</span>
          <span className="tile-label">notificadas</span>
        </div>
      </div>

      <div className="chart">
        <h3>Vagas por faixa de score</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.byScoreBucket} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="bucket" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {stats.byScoreBucket.map((entry, i) => (
                <Cell key={entry.bucket} fill={SCORE_COLORS[i % SCORE_COLORS.length] ?? ACCENT} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart">
        <h3>Vagas por fonte</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={stats.bySource}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
          >
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="source"
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
            <Bar dataKey="count" fill={ACCENT} radius={[0, 6, 6, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart">
        <h3>Vagas vistas por dia</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.byDay} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="date" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
            <Bar dataKey="count" fill={ACCENT} radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
