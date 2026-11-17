import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth";
import { Logo, Page } from "../components/ui";

const CODE_CHARS = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

export default function Home() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const { account, signIn } = useAuth();

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 5) navigate(`/join/${code}`);
  };

  return (
    <Page>
      <section className="pop pt-6 text-center">
        <Logo size="text-6xl" />
        <p className="mt-3 text-lg text-slate-300">
          Ігри для твоєї компанії. Один створює кімнату — друзі заходять за кодом зі своїх телефонів.
        </p>
      </section>

      <form onSubmit={join} className="card mt-8">
        <label htmlFor="code" className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Маєш код кімнати?
        </label>
        <input
          id="code"
          className="input mt-2 text-center font-mono text-3xl font-black uppercase tracking-[0.4em]"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(CODE_CHARS, "").slice(0, 5))}
          placeholder="K7Q2M"
          autoComplete="off"
          autoCapitalize="characters"
          inputMode="text"
        />
        <button className="btn-primary mt-3 w-full text-lg" disabled={code.length !== 5}>
          Приєднатися
        </button>
      </form>

      <div className="card mt-4 text-center">
        <p className="text-slate-300">Збираєш друзів?</p>
        <button
          className="btn-blue mt-3 w-full text-lg"
          onClick={() => (account ? navigate("/host") : signIn("/host"))}
        >
          👑 Створити кімнату
        </button>
        {!account && <p className="mt-2 text-xs text-slate-500">Ведучому потрібен акаунт: email або Google</p>}
      </div>

      <ul className="mt-8 grid grid-cols-3 gap-3 text-center text-sm text-slate-300">
        <li className="card p-3">
          <div className="text-2xl">📱</div>Кожен грає зі свого телефона
        </li>
        <li className="card p-3">
          <div className="text-2xl">🏆</div>Спільне табло на весь вечір
        </li>
        <li className="card p-3">
          <div className="text-2xl">🇺🇦</div>Усе українською
        </li>
      </ul>
    </Page>
  );
}
