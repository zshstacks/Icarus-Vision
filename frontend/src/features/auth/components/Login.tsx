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

  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col font-sans text-[#E6EDF3] selection:bg-[#39C5CF] selection:text-[#0D1117] overflow-hidden">
      <header className="h-16 border-b border-[#30363D] bg-[#0D1117] flex items-center justify-between px-6 z-20">
        <div className="flex items-center space-x-3">
          <div className="h-3.5 w-3.5 rotate-45 rounded-sm border-2 border-[#39C5CF]" />
          <span className="font-semibold text-lg tracking-wide text-[#E6EDF3]">
            Icarus Vision
          </span>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-4">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `
                linear-gradient(to right, #8B949E 1px, transparent 1px),
                linear-gradient(to bottom, #8B949E 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-[#39C5CF] rounded-full blur-[150px] opacity-[0.04]" />
        </div>

        <div className="relative z-10 w-full max-w-115 bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl p-10">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-[#E6EDF3] tracking-tight mb-2">
              Sign in
            </h1>
            <p className="text-blue-500">Login: DemoTest</p>
            <p className="text-red-500">Password: zshstacksPSW</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                className="block text-sm font-medium text-[#E6EDF3] mb-2"
                htmlFor="username"
              >
                Email or username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-[#6E7681]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email or username"
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-[#39C5CF] focus:ring-1 focus:ring-[#39C5CF] transition-colors duration-200"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-[#E6EDF3] mb-2"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-[#6E7681]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-[#39C5CF] focus:ring-1 focus:ring-[#39C5CF] transition-colors duration-200"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !username || !password}
              className="w-full bg-[#39C5CF] hover:bg-[#58A6FF] disabled:opacity-50 disabled:cursor-not-allowed text-[#0D1117] font-semibold text-sm rounded-lg py-2.5 mt-2 transition-colors duration-200 flex justify-center items-center h-11"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Login;
