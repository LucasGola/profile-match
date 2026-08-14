import { useState } from 'react';
import './App.css';
import { Analytics } from './components/Analytics';
import { JobsList } from './components/JobsList';
import { ProfileForm } from './components/ProfileForm';

type Tab = 'jobs' | 'profile' | 'analytics';

const TABS: { id: Tab; label: string }[] = [
  { id: 'jobs', label: 'Vagas' },
  { id: 'profile', label: 'Perfil' },
  { id: 'analytics', label: 'Análise' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('jobs');

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ◎
          </span>
          <div>
            <h1>Profile Match</h1>
            <p>Vagas rankeadas pela aderência ao seu perfil.</p>
          </div>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === tab}
              className={t.id === tab ? 'tab tab-active' : 'tab'}
              onClick={() => {
                setTab(t.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {tab === 'jobs' && <JobsList />}
        {tab === 'profile' && <ProfileForm />}
        {tab === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}
