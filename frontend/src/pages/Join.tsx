import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError, session } from "../api/client";
import { ErrorNote, Page } from "../components/ui";

export const EMOJIS = ["🦊", "🐸", "🐼", "🦄", "🐙", "🐝", "🦉", "🐯", "🐨", "🐵", "🐧", "🐢", "🦖", "🐳", "🦋", "🐞"];

const NAME_KEY = "squad:name";

export function NameForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (name: string, emoji: string) => Promise<void>;
}) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
  const [emoji, setEmoji] = useState(() => EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(NAME_KEY, name.trim());
      await onSubmit(name.trim(), emoji);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Щось пішло не так");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card">
      <label htmlFor="name" className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Як тебе звати?
      </label>
      <input
        id="name"
        className="input mt-2"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 20))}
        placeholder="Ім'я або нікнейм"
        autoFocus
        maxLength={20}
      />
      <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Твій аватар</p>
      <div className="mt-2 grid grid-cols-8 gap-2">
        {EMOJIS.map((e) => (
          <button
            type="button"
            key={e}
            onClick={() => setEmoji(e)}
            className={`aspect-square rounded-xl text-2xl transition ${
              e === emoji ? "scale-110 bg-yellow/25 ring-2 ring-yellow" : "bg-ink/50"
            }`}
            aria-label={`Аватар ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
      <button className="btn-primary mt-5 w-full text-lg" disabled={busy || !name.trim()}>
        {busy ? "Секунду..." : submitLabel}
      </button>
      <ErrorNote text={error} />
    </form>
  );
}

export default function Join() {
  const { code = "" } = useParams();
  const upper = code.toUpperCase();
  const navigate = useNavigate();

  // Already in this room on this phone? Go straight back in.
  useEffect(() => {
    if (session.get(upper)) navigate(`/room/${upper}`, { replace: true });
  }, [upper, navigate]);

  return (
    <Page>
      <h1 className="pop mb-4 text-center text-2xl font-bold">
        Кімната <span className="font-mono tracking-widest text-yellow">{upper}</span>
      </h1>
      <NameForm
        submitLabel="Увійти в кімнату"
        onSubmit={async (name, emoji) => {
          const res = await api.join(upper, name, emoji);
          session.set(res.code, res.token);
          navigate(`/room/${res.code}`, { replace: true });
        }}
      />
    </Page>
  );
}
