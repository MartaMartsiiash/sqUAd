import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type GameMeta } from "../api/client";
import { useAuth } from "../auth/auth";
import { Blob, Glare, Logo, Num, Page } from "../components/ui";

const CODE_CHARS = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

export default function Home() {
  const [code, setCode] = useState("");
  const [games, setGames] = useState<GameMeta[]>([]);
  const navigate = useNavigate();
  const { account, signIn } = useAuth();

  useEffect(() => {
    api.games().then(setGames).catch(() => setGames([]));
  }, []);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 5) navigate(`/join/${code}`);
  };

  return (
    <Page wide>
      {/* Hero: the brand wordmark over the red glare, with silver drops around it. */}
      <section className="relative pb-6 pt-4">
        <Glare className="absolute -left-10 top-6 w-[115%] max-w-none opacity-45 sm:-left-16 sm:w-[85%]" />
        <Blob n={1} className="float absolute -right-8 top-14 w-20 [--r:12deg] sm:right-4 sm:-top-4 sm:w-40" />
        <Blob n={5} className="float absolute bottom-0 right-[12%] hidden w-24 [--r:-20deg] [animation-delay:-4s] sm:block" />
        <div className="relative">
          <div className="flex justify-between">
            <span className="label">party games</span>
            <span className="label">for your squad</span>
          </div>
          <h1 className="pop mt-8">
            <Logo className="h-[22vw] max-h-48 sm:h-40" />
          </h1>
          <div className="mt-8 grid max-w-xl gap-4">
            <p className="relative max-w-md text-lg leading-snug">
              Ігри для компанії, яка зібралася разом. Один створює кімнату, решта заходить за кодом
              зі своїх телефонів.
            </p>
            <p className="label max-w-sm">
              Кожен грає зі свого телефона · спільне табло на весь вечір · усе українською
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <form onSubmit={join} className="card pop">
          <label htmlFor="code" className="label">
            Маєш код кімнати?
          </label>
          <input
            id="code"
            className="input mt-3 text-center font-mono text-3xl font-semibold uppercase tracking-[0.45em]"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(CODE_CHARS, "").slice(0, 5))}
            placeholder="K7Q2M"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button className="btn-primary mt-3 w-full" disabled={code.length !== 5}>
            Приєднатися
          </button>
        </form>

        <div className="card pop flex flex-col justify-between">
          <div>
            <span className="label">Збираєш компанію?</span>
            <p className="display mt-3 text-2xl">Створи кімнату</p>
            <p className="mt-2 text-sm text-muted">
              Ведучому потрібен акаунт (email або Google). Гравцям — лише код і ім'я.
            </p>
          </div>
          <button
            className="btn-ghost mt-4 w-full"
            onClick={() => (account ? navigate("/host") : signIn("/host"))}
          >
            {account ? "Нова кімната" : "Увійти й створити"}
          </button>
        </div>
      </section>

      {games.length > 0 && (
        <section className="relative mt-14">
          <Blob n={2} className="float absolute -top-14 right-0 w-24 [--r:-10deg] sm:-top-20 sm:w-36" />
          <div className="flex items-end justify-between border-b border-line pb-3">
            <h2 className="display text-3xl sm:text-5xl">Ігри</h2>
            <span className="label">{games.length} на вечір</span>
          </div>
          <ol className="divide-y divide-line">
            {games.map((g, i) => (
              <li key={g.id} className="grid grid-cols-[2.5rem_1fr] gap-3 py-4 sm:grid-cols-[4rem_1fr_auto]">
                <Num n={i + 1} className="text-sm text-red" />
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold uppercase">{g.title}</p>
                  <p className="text-sm text-muted">{g.description}</p>
                </div>
                <span className="label col-start-2 sm:col-start-3 sm:self-center">
                  {g.tag}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className="mt-16 flex flex-wrap justify-between gap-2 border-t border-line pt-4">
        <span className="label">sqUAd · made in Ukraine</span>
        <span className="flex gap-4">
          <Link to="/privacy" className="label hover:text-fg">
            Конфіденційність
          </Link>
          <span className="label">UCU · OOAD 2026</span>
        </span>
      </footer>
    </Page>
  );
}
