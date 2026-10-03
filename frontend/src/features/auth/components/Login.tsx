import { useState, type FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../../redux/authSlice/authSlice";
import type { AppDispatch, RootState } from "../../../redux/store";

const Login = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { submitting, error } = useSelector((s: RootState) => s.auth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    dispatch(login({ username, password }));
  };

  const canSubmit = Boolean(username && password) && !submitting;

  return (
    <div className="flex min-h-screen flex-col bg-[#0D1117] font-sans text-[#E6EDF3] antialiased">
      <header className="flex h-14 shrink-0 items-center border-b border-[#21262D] px-6">
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rotate-45 rounded-xs border-2 border-[#39C5CF]" />
          <span className="text-[14px] font-medium">Icarus Vision</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-90">
          <h1 className="text-[20px] font-medium tracking-tight">Sign in</h1>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-[12px] text-[#8B949E]"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-10 w-full rounded-md border border-[#30363D] bg-[#0D1117] px-3 text-[13px] text-[#E6EDF3] outline-none transition-colors focus:border-[#39C5CF]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[12px] text-[#8B949E]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-[#30363D] bg-[#0D1117] px-3 text-[13px] text-[#E6EDF3] outline-none transition-colors focus:border-[#39C5CF]"
              />
            </div>

            {error && (
              <p className="text-[12px] text-[#F85149]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="h-10 w-full rounded-md bg-[#39C5CF] text-[13px] font-medium text-[#0D1117] transition-colors hover:bg-[#45CFD9] disabled:cursor-not-allowed disabled:bg-[#21262D] disabled:text-[#6E7681] cursor-pointer"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 font-mono text-[11px] text-[#6E7681]">
            <p>Login - DemoTest</p>
            <p>Password - zshstacksPSW</p>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
