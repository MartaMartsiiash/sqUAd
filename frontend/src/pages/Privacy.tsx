import { Header, Page } from "../components/ui";

// Privacy policy: Google requires a public link to one before "Sign in with Google" goes live.
export default function Privacy() {
  return (
    <Page>
      <Header />
      <main className="relative z-10 mx-auto w-full max-w-2xl space-y-5 px-5 py-10 leading-relaxed">
        <h1 className="display text-3xl">Політика конфіденційності</h1>
        <p className="text-muted">Оновлено 18 листопада 2026 року.</p>
        <p>
          sqUAd — навчальний проєкт студентів Українського католицького університету: сайт для
          спільних ігор з друзями. Ми збираємо лише те, без чого гра не працює.
        </p>
        <h2 className="display text-xl">Що ми зберігаємо</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Ведучий: адреса email, з якою він входить (через пошту або Google).</li>
          <li>Гравці: ім'я та колір аватарки, які вони самі вводять. Акаунт не потрібен.</li>
          <li>Стан кімнати: код, бали, хід гри. Кімнати видаляються автоматично через 24 години.</li>
          <li>
            Донати через банку monobank: сума, дата й коментар (код кімнати), щоб відкрити безліміт.
            Номерів карток ми не бачимо й не зберігаємо.
          </li>
        </ul>
        <h2 className="display text-xl">Що ми не робимо</h2>
        <p>
          Не продаємо й не передаємо дані третім особам, не показуємо рекламу, не використовуємо
          сторонніх трекерів. Дані зберігаються в Amazon Web Services (регіон eu-north-1).
        </p>
        <h2 className="display text-xl">Видалення даних</h2>
        <p>
          Щоб видалити акаунт ведучого, напишіть на адресу, вказану в налаштуваннях Google-застосунку
          sqUAd, або зверніться до авторів проєкту в УКУ.
        </p>
      </main>
    </Page>
  );
}
