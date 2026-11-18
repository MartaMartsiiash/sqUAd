import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, session } from "../api/client";
import { useAuth } from "../auth/auth";
import { Page, Waiting } from "../components/ui";
import { NameForm } from "./Join";

export default function Host() {
  const { account, ready, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !account) signIn("/host");
  }, [ready, account, signIn]);

  if (!account) {
    return (
      <Page>
        <Waiting>Переходимо до входу...</Waiting>
      </Page>
    );
  }

  return (
    <Page>
      <span className="label">Ведучий</span>
      <h1 className="display pop mb-6 mt-2 text-4xl">Нова кімната</h1>
      <NameForm
        submitLabel="Створити кімнату"
        onSubmit={async (name, color) => {
          const res = await api.createRoom(account.token, name, color);
          session.set(res.code, res.token);
          navigate(`/room/${res.code}`);
        }}
      />
    </Page>
  );
}
