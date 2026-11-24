
import { useState } from 'react';
import {
  Headset,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import Dashboard from './components/Dashboard';

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');

    if (!token || !savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/token/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      console.log('Login status:', response.status);
      console.log('Login response keys:', Object.keys(data));

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid username or password');
      }

      if (!data.access) {
        throw new Error('Access token not received from server');
      }

      localStorage.setItem('access_token', data.access);

      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }

      const profileResponse = await fetch(
        'http://127.0.0.1:8000/api/accounts/me/',
        {
          headers: {
            Authorization: `Bearer ${data.access}`,
          },
        }
      );

      const profile = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(
          profile.detail || 'Unable to retrieve user profile'
        );
      }

      localStorage.setItem('user', JSON.stringify(profile));
      setUser(profile);

    } catch (error) {
      console.error('Login error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080d19] p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#111827] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
            <Headset size={32} />
          </div>

          <h1 className="text-3xl font-bold">AI HelpDesk</h1>

          <p className="mt-2 text-slate-400">
            Smart support management powered by AI
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Username
            </label>

            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3">
              <Mail size={18} className="text-slate-400" />

              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your username"
                required
                className="w-full bg-transparent p-3 text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Password
            </label>

            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3">
              <Lock size={18} className="text-slate-400" />

              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full bg-transparent p-3 text-white outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={16} />
          Secure IT Support Access
        </div>
      </div>
    </div>
  );
}

export default App;
