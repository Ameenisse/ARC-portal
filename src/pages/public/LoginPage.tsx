import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PinInput } from '../../components/common/PinInput';
import { ShieldCheck, ArrowRight, User as UserIcon, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !pin) {
      setError('ޔޫޒަރނޭމް އަދި ޕިން ނަންބަރު ރަނގަޅަށް ފުރަންވާނެ.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(username, pin);
      // Redirect to /portal
      window.location.href = '/portal';
    } catch (err: any) {
      setError(err.message || 'ޔޫޒަރނޭމް ނުވަތަ ޕިން ނަންބަރު ނުބައި.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Header Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg shadow-orange-500/20">
            ARC
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading text-white">އާނަންދާ ރީކްރިއޭޝަން ކްލަބް ޕޯޓަލް</h1>
            <p className="text-xs text-slate-400 mt-1">ހިންގާ ކޮމިޓީ އަދި އެޑްމިން ސައިޓަށް ވަނުމަށް</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Input */}
          <div className="space-y-1.5">
            <label htmlFor="login_username" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              ޔޫޒަރނޭމް
            </label>
            <div className="relative flex items-center">
              <div className="absolute right-3 text-slate-500 pointer-events-none">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="login_username"
                type="text"
                required
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ޔޫޒަރނޭމް"
                className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Numeric PIN Input */}
          <PinInput
            id="login_pin"
            value={pin}
            onChange={setPin}
            label="ޕިން ނަންބަރު"
            placeholder="****"
            required
            maxLength={8}
          />

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="login_submit_btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>ޕޯޓަލް އަށް ވަނުމަށް</span>
            )}
          </button>
        </form>

        {/* Return to Public Website */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <a
            id="return_to_website_btn"
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>މައި ވެބްސައިޓަށް އެނބުރި ދިއުމަށް</span>
          </a>
        </div>

      </div>
    </div>
  );
};

