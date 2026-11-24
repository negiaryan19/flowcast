import { useState } from "react";
import type { FormEvent } from "react";
import { authenticate } from "../api";
import type { User } from "../types";
import { Brand, Icon } from "./Icons";
import { CityScene } from "./CityScene";
export function Login({ onEnter }: { onEnter: (user: User | null) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [help, setHelp] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const { user } = await authenticate(mode, {
        name: String(f.get("name") ?? ""),
        email: String(f.get("email")),
        password: String(f.get("password")),
      });
      onEnter(user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-layout">
      <section className="login-story">
        <Brand />
        <div className="story-copy">
          <span className="caps">
            <i /> INTELLIGENCE IN MOTION
          </span>
          <h1>
            See what’s next.
            <br />
            <em>Keep moving.</em>
          </h1>
          <p>
            A clearer view of traffic. A better way to understand
            <br className="desktop-break" /> the roads that connect us.
          </p>
        </div>
        <div className="city-stage">
          <CityScene />
          <div className="city-label">
            <span className="signal-ring" />
            <div>
              <strong>Every pattern tells a story.</strong>
              <small>Turn traffic observations into a clearer forecast.</small>
            </div>
          </div>
          <span className="city-coordinate">
            ILLUSTRATIVE CITY NETWORK / 3D
          </span>
        </div>
        <div className="story-bottom">
          <span>
            <Icon name="activity" size={18} /> Forecast. Explore. Understand.
          </span>
          <span>FLOWCAST / 01</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-top">
          <span>YOUR TRAFFIC WORKSPACE</span>
          <button className="text-button" onClick={() => setHelp(!help)}>
            <Icon name="help" size={17} /> Need help?
          </button>
        </div>
        <div className="login-form-wrap">
          <span className="mini-route">
            <Icon name="wave" size={28} />
          </span>
          <h2>
            {mode === "login" ? "Welcome back." : "Make room for insight."}
          </h2>
          <p>
            {mode === "login"
              ? "Your next insight is one sign-in away."
              : "Create your local FlowCast account to get started."}
          </p>
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              role="tab"
              aria-selected={mode === "login"}
              disabled={busy}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={mode === "register"}
              disabled={busy}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Create account
            </button>
          </div>
          <form onSubmit={submit} key={mode}>
            {mode === "register" && (
              <label>
                Full name
                <div className="input-wrap">
                  <Icon name="user" />
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </div>
              </label>
            )}
            <label>
              Email address
              <div className="input-wrap">
                <Icon name="mail" />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  maxLength={254}
                />
              </div>
            </label>
            <label>
              Password
              <div className="input-wrap">
                <Icon name="lock" />
                <input
                  type={visible ? "text" : "password"}
                  name="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? "Enter your password"
                      : "At least 10 characters"
                  }
                  required
                  minLength={mode === "register" ? 10 : 1}
                  maxLength={128}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  <Icon name="eye" size={18} />
                </button>
              </div>
            </label>
            <div className="form-meta">
              <span>
                <Icon name="shield" size={14} /> Local workspace account
              </span>
              <button
                type="button"
                className="text-button"
                onClick={() => setHelp(!help)}
              >
                Account help
              </button>
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="primary-button auth-submit" disabled={busy}>
              {busy
                ? "Connecting…"
                : mode === "login"
                  ? "Sign in to FlowCast"
                  : "Create your account"}
            </button>
          </form>
          <div className="divider">
            <span>OR EXPLORE FIRST</span>
          </div>
          <button
            className="secondary-button demo-button"
            disabled={busy}
            onClick={() => onEnter(null)}
          >
            <Icon name="play" size={16} /> Explore demo workspace
          </button>
          <p className="auth-caption">
            No account needed. Real historical forecasts.
          </p>
          {help && (
            <div className="help-panel" role="status">
              <strong>Your workspace, on this computer.</strong>
              <p>
                Create an account above or explore the public demo. Email
                verification and password recovery are not connected yet. Use a
                unique password for this local account.
              </p>
            </div>
          )}
        </div>
        <footer className="login-footer">
          <span>© 2026 FlowCast</span>
          <span>Built for a world in motion.</span>
        </footer>
      </section>
    </main>
  );
}
