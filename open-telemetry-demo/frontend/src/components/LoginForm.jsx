import { useState } from "react";
import { login } from "../graft/client.js";

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("wad");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(username, password);
      onLogin({
        token: result.get_token(),
        username: result.get_username(),
      });
    } catch (submitError) {
      setError(submitError?.message ?? String(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card login-card">
      <h1>City Weather</h1>
      <p className="subtitle">Sign in to browse your cities and check the weather.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="hint">Demo users: wad/password, alice/alice, bob/bob</p>
    </section>
  );
}
