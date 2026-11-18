import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError, session } from "../api/client";
import { AVATAR_COLORS, Avatar, ErrorNote, Page } from "../components/ui";

const NAME_KEY = "squad:name";

export function NameForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (name: string, color: string) => Promise<void>;
}) {
  const [color, setColor] = useState<string>(() => {
    try {
      return localStorage.getItem("squad:color") ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    } catch {
      return "silver";
    }
  });
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      try {
        localStorage.setItem(NAME_KEY, name.trim());
        localStorage.setItem("squad:color", color);
      } catch {
        /* private mode */
      }
      await onSubmit(name.trim(), color);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Щось пішло не так");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card pop">
      <label htmlFor="name" className="label">
        Як тебе звати?
      </label>
      <input
        id="name"
        className="input mt-3"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 20))}
        placeholder="Ім'я або нікнейм"
        autoFocus
        maxLength={20}
        autoComplete="nickname"
      />
      <p className="label mt-5">Твій персонаж</p>
      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {AVATAR_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Колір ${c}`}
            aria-pressed={c === color}
            className={`flex justify-center rounded-2xl border pt-2 transition ${
              c === color ? "border-red bg-red/10" : "border-line bg-bg/40 hover:border-fg/40"
            }`}
          >
            <Avatar p={{ color: c, name: "" }} size="h-14 w-12" />
          </button>
        ))}
      </div>
      <button className="btn-primary mt-5 w-full" disabled={busy || !name.trim()}>
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
      <span className="label">Кімната</span>
      <h1 className="display pop mb-6 mt-2 font-mono text-5xl tracking-[0.2em] text-red">{upper}</h1>
      <NameForm
        submitLabel="Увійти в кімнату"
        onSubmit={async (name, color) => {
          const res = await api.join(upper, name, color);
          session.set(res.code, res.token);
          navigate(`/room/${res.code}`, { replace: true });
        }}
      />
    </Page>
  );
}
