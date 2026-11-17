import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth";
import { ErrorNote, Page, Waiting } from "../components/ui";

/** Cognito sends the browser back here with ?code=...; we exchange it for tokens. */
export default function AuthCallback() {
  const { completeSignIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return; // React dev mode runs effects twice; the code works only once
    done.current = true;
    completeSignIn()
      .then((to) => navigate(to, { replace: true }))
      .catch(() => setError("Не вдалося увійти. Спробуйте ще раз."));
  }, [completeSignIn, navigate]);

  return <Page>{error ? <ErrorNote text={error} /> : <Waiting>Входимо...</Waiting>}</Page>;
}
