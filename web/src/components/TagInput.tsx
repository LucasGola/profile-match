import { useState, type ClipboardEvent, type KeyboardEvent } from 'react';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

// Campo de tags: cada termo vira um chip removível. Enter/vírgula commitam;
// Backspace no campo vazio remove o último; colar texto com vírgulas divide em
// vários. Sem dependência externa — o estado das tags vive no componente pai.
export function TagInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('');

  const addMany = (raws: string[]) => {
    const seen = new Set(value.map((v) => v.toLowerCase()));
    const additions: string[] = [];
    for (const raw of raws) {
      const tag = raw.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      additions.push(tag);
    }
    if (additions.length > 0) onChange([...value, ...additions]);
  };

  const commitDraft = () => {
    addMany([draft]);
    setDraft('');
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeAt(value.length - 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.includes(',')) {
      e.preventDefault();
      addMany(text.split(','));
      setDraft('');
    }
  };

  return (
    <div className="tag-input">
      {value.map((tag, i) => (
        <span key={tag} className="tag">
          {tag}
          <button
            type="button"
            className="tag-remove"
            aria-label={`remover ${tag}`}
            onClick={() => {
              removeAt(i);
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="tag-draft"
        value={draft}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={commitDraft}
      />
    </div>
  );
}
