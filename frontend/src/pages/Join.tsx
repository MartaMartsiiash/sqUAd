import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError, session } from "../api/client";
import { ErrorNote, Page } from "../components/ui";

const NAME_KEY = "squad:name";

export function NameForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (name: string) => Promise<void>;
}) {
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
      } catch {
        /* private mode */
      }
      await onSubmit(name.trim());
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
      <button className="btn-primary mt-4 w-full" disabled={busy || !name.trim()}>
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
        onSubmit={async (name) => {
          const res = await api.join(upper, name);
          session.set(res.code, res.token);
          navigate(`/room/${res.code}`, { replace: true });
        }}
      />
    </Page>
  );
}
