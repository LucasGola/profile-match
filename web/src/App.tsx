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
        <h1>Profile Match</h1>
        <p>Vagas rankeadas pela aderência ao seu perfil.</p>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
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
