// Host sign-in with Amazon Cognito (OpenID Connect, authorization code + PKCE).
// Locally, VITE_AUTH_DEV=true replaces Cognito with "type any email".

import { User, UserManager, WebStorageStateStore } from "oidc-client-ts";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const DEV = import.meta.env.VITE_AUTH_DEV === "true";
const AUTHORITY = import.meta.env.VITE_COGNITO_AUTHORITY ?? "";
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID ?? "";
const DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN ?? "").replace(/\/$/, "");

const manager =
  !DEV && AUTHORITY && CLIENT_ID
    ? new UserManager({
        authority: AUTHORITY,
        client_id: CLIENT_ID,
        redirect_uri: `${window.location.origin}/auth/callback`,
        post_logout_redirect_uri: `${window.location.origin}/`,
        response_type: "code",
        scope: "openid email profile",
        userStore: new WebStorageStateStore({ store: window.localStorage }),
      })
    : null;

export type Account = { email: string; token: string };

type AuthState = {
  account: Account | null;
  ready: boolean;
  signIn: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeSignIn: () => Promise<string>;
};

const Ctx = createContext<AuthState | null>(null);

function fromUser(user: User | null): Account | null {
  if (!user || user.expired) return null;
  const email = (user.profile.email as string) ?? user.profile.sub;
  // The backend checks the access token: it is meant for APIs.
  return { email, token: user.access_token };
}

const DEV_KEY = "squad:dev-account";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (DEV) {
      const email = localStorage.getItem(DEV_KEY);
      setAccount(email ? { email, token: `dev:${email}` } : null);
      setReady(true);
      return;
    }
    if (!manager) {
      setReady(true);
      return;
    }
    manager.getUser().then((u) => {
      setAccount(fromUser(u));
      setReady(true);
    });
    const onLoaded = (u: User) => setAccount(fromUser(u));
    const onUnloaded = () => setAccount(null);
    manager.events.addUserLoaded(onLoaded);
    manager.events.addUserUnloaded(onUnloaded);
    return () => {
      manager.events.removeUserLoaded(onLoaded);
      manager.events.removeUserUnloaded(onUnloaded);
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      account,
      ready,
      async signIn(returnTo = "/host") {
        if (DEV) {
          const email = window.prompt("Локальний режим: введіть будь-який email", "host@squad.local");
          if (!email) return;
          localStorage.setItem(DEV_KEY, email);
          setAccount({ email, token: `dev:${email}` });
          window.location.assign(returnTo);
          return;
        }
        if (!manager) throw new Error("Вхід не налаштований");
        await manager.signinRedirect({ state: returnTo });
      },
      async signOut() {
        if (DEV) {
          localStorage.removeItem(DEV_KEY);
          setAccount(null);
          return;
        }
        if (!manager) return;
        await manager.removeUser();
        // Cognito's hosted UI has its own logout endpoint (it does not implement end_session).
        const back = encodeURIComponent(`${window.location.origin}/`);
        window.location.assign(`${DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${back}`);
      },
      async completeSignIn() {
        if (!manager) return "/";
        const user = await manager.signinRedirectCallback();
        setAccount(fromUser(user));
        return typeof user.state === "string" ? user.state : "/host";
      },
    }),
    [account, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
