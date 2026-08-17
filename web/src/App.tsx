import type { ReactNode } from 'react';
import { useState } from 'react';
import './App.css';
import { Analytics } from './components/Analytics';
import { JobsList } from './components/JobsList';
import { ProfileForm } from './components/ProfileForm';

type Tab = 'jobs' | 'profile' | 'analytics';

const IconBriefcase = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
  </svg>
);
const IconSliders = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M18 18h2" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="16" cy="18" r="2" />
  </svg>
);
const IconChart = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

const TABS: { id: Tab; label: string; title: string; subtitle: string; icon: ReactNode }[] = [
  {
    id: 'jobs',
    label: 'Vagas',
    title: 'Vagas',
    subtitle: 'Rankeadas pela aderência ao seu perfil.',
    icon: IconBriefcase,
  },
  {
    id: 'profile',
    label: 'Perfil',
    title: 'Seu perfil',
    subtitle: 'Ajuste os critérios — salvar re-pontua as vagas.',
    icon: IconSliders,
  },
  {
    id: 'analytics',
    label: 'Análise',
    title: 'Análise',
    subtitle: 'Visão geral das vagas coletadas.',
    icon: IconChart,
  },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('jobs');
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ◎
          </span>
          <span className="brand-name">Profile&nbsp;Match</span>
        </div>

        <nav className="nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={t.id === tab ? 'nav-item nav-active' : 'nav-item'}
              onClick={() => {
                setTab(t.id);
              }}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className="status-dot" />
          <span>Vagas de fontes remotas legítimas</span>
        </div>
      </aside>

      <main className="content">
        <header className="content-head">
          <h1>{active.title}</h1>
          <p>{active.subtitle}</p>
        </header>
        <div className="content-body">
          {tab === 'jobs' && <JobsList />}
          {tab === 'profile' && <ProfileForm />}
          {tab === 'analytics' && <Analytics />}
        </div>
      </main>
    </div>
  );
}
