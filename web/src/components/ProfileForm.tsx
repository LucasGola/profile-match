import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Profile, Seniority } from '../types';

const toText = (arr: string[]) => arr.join(', ');
const toArr = (text: string) =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

const WEIGHT_KEYS = ['stack', 'seniority', 'remote', 'keywords'] as const;

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stackText, setStackText] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [remoteTermsText, setRemoteTermsText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getProfile()
      .then((p) => {
        if (!active) return;
        setProfile(p);
        setStackText(toText(p.stack));
        setKeywordsText(toText(p.keywords));
        setRemoteTermsText(toText(p.matching.remoteTerms));
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'erro ao carregar');
      });
    return () => {
      active = false;
    };
  }, []);

  if (error && !profile) return <p className="error">{error}</p>;
  if (!profile) return <p className="muted">Carregando…</p>;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    setError(null);
    const payload: Profile = {
      ...profile,
      stack: toArr(stackText),
      keywords: toArr(keywordsText),
      matching: { ...profile.matching, remoteTerms: toArr(remoteTermsText) },
    };
    try {
      const res = await api.saveProfile(payload);
      setProfile(res.profile);
      setStatus(`Perfil salvo — ${String(res.rescored)} vaga(s) re-pontuada(s).`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form">
      <label>
        Stack (separado por vírgula)
        <input
          value={stackText}
          onChange={(e) => {
            setStackText(e.target.value);
          }}
          placeholder="typescript, node, postgres"
        />
      </label>

      <label>
        Palavras-chave
        <input
          value={keywordsText}
          onChange={(e) => {
            setKeywordsText(e.target.value);
          }}
          placeholder="backend, api"
        />
      </label>

      <label>
        Senioridade
        <select
          value={profile.seniority ?? ''}
          onChange={(e) => {
            setProfile({ ...profile, seniority: (e.target.value || null) as Seniority | null });
          }}
        >
          <option value="">Indiferente</option>
          <option value="junior">Junior</option>
          <option value="mid">Pleno</option>
          <option value="senior">Senior</option>
        </select>
      </label>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={profile.remote}
          onChange={(e) => {
            setProfile({ ...profile, remote: e.target.checked });
          }}
        />
        Prefiro vagas remotas
      </label>

      <fieldset className="weights">
        <legend>Pesos dos critérios</legend>
        {WEIGHT_KEYS.map((key) => (
          <label key={key} className="weight">
            {key}
            <input
              type="number"
              min={0}
              step={1}
              value={profile.weights[key]}
              onChange={(e) => {
                setProfile({
                  ...profile,
                  weights: { ...profile.weights, [key]: Number(e.target.value) },
                });
              }}
            />
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        className="link"
        onClick={() => {
          setShowAdvanced(!showAdvanced);
        }}
      >
        {showAdvanced ? 'Ocultar avançado' : 'Mostrar avançado'}
      </button>

      {showAdvanced && (
        <fieldset>
          <legend>Avançado</legend>
          <label>
            Tolerância do fuzzy (0–1)
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={profile.matching.fuzzyThreshold}
              onChange={(e) => {
                setProfile({
                  ...profile,
                  matching: { ...profile.matching, fuzzyThreshold: Number(e.target.value) },
                });
              }}
            />
          </label>
          <label>
            Termos que indicam &quot;remoto&quot;
            <input
              value={remoteTermsText}
              onChange={(e) => {
                setRemoteTermsText(e.target.value);
              }}
            />
          </label>
        </fieldset>
      )}

      <div className="form-actions">
        <button
          type="button"
          onClick={() => {
            void save();
          }}
          disabled={saving}
        >
          {saving ? 'Salvando…' : 'Salvar perfil'}
        </button>
        {status && <span className="ok">{status}</span>}
        {error && <span className="error">{error}</span>}
      </div>
    </section>
  );
}
