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

// Rampa semântica de "qualidade do match" (dark): neutro → âmbar → verde.
const SCORE_COLORS = ['#6b7280', '#d97706', '#f59e0b', '#22c55e', '#34d399'];
const GRID = '#242835';
const AXIS = '#6c7280';

const tickStyle = { fontSize: 12, fill: AXIS } as const;
const tooltipStyle = {
  background: '#1a1d26',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
  fontSize: 13,
} as const;
const cursorFill = { fill: 'rgba(109,118,245,0.1)' } as const;
const labelStyle = { color: '#eceef3' } as const;

function AccentGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7c84f7" />
        <stop offset="100%" stopColor="#a568f0" />
      </linearGradient>
    </defs>
  );
}

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
          <BarChart data={stats.byScoreBucket} margin={{ top: 6, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="bucket" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={cursorFill} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={70}>
              {stats.byScoreBucket.map((entry, i) => (
                <Cell key={entry.bucket} fill={SCORE_COLORS[i % SCORE_COLORS.length] ?? AXIS} />
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
            <AccentGradient id="grad-source" />
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis
              type="number"
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="source"
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
              width={92}
            />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={cursorFill} />
            <Bar dataKey="count" fill="url(#grad-source)" radius={[0, 6, 6, 0]} maxBarSize={38} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart">
        <h3>Vagas vistas por dia</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.byDay} margin={{ top: 6, right: 8, bottom: 0, left: -14 }}>
            <AccentGradient id="grad-day" />
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="date" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} cursor={cursorFill} />
            <Bar dataKey="count" fill="url(#grad-day)" radius={[6, 6, 0, 0]} maxBarSize={54} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
