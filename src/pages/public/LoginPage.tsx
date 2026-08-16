import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PinInput } from '../../components/common/PinInput';
import {
  ShieldCheck,
  ArrowRight,
  User as UserIcon,
  AlertCircle,
  KeyRound,
  Sparkles,
  Lock,
  Globe,
  Users,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [lang, setLang] = useState<'dhivehi' | 'english'>('dhivehi');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = {
    dhivehi: {
      portalTitle: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް ޕޯޓަލް',
      portalSub: 'މެނޭޖްމަންޓް ޕޯޓަލް އަދި މެންބަރުންގެ ސެލްފް-ސާވިސް ސައިޓް',
      badge: 'ރަސްމީ ޕޯޓަލް ލޮގިން',
      usernameLabel: 'ޔޫޒަރނޭމް (Username)',
      usernamePlaceholder: 'admin ނުވަތަ މެންބަރުގެ ޔޫޒަރނޭމް',
      pinLabel: 'ޕިން ނަންބަރު (Numeric PIN)',
      pinPlaceholder: '****',
      loginBtn: 'ޕޯޓަލް އަށް ވަނުމަށް (Login to Portal)',
      loggingIn: 'ވަދެވެނީ...',
      backToWeb: 'މައި ވެބްސައިޓަށް އެނބުރި ދިއުމަށް (Back to Website)',
      emptyError: 'ޔޫޒަރނޭމް އަދި ޕިން ނަންބަރު ފުރަންވާނެ.',
      invalidError: 'ޔޫޒަރނޭމް ނުވަތަ ޕިން ނަންބަރު ނުބައި.',
      quickFillTitle: 'އަވަހަށް ލޮގިންވުމަށް (Quick Access):',
      adminRole: 'އެޑްމިން ކޮންޓްރޯލަރ (Admin)',
      excoRole: 'ހިންގާ ކޮމިޓީ (EXCO)',
      memberRole: 'މެންބަރު (Member)',
      securityNotice: 'މި ޕޯޓަލަކީ ހަމައެކަނި ހުއްދަ ލިބިފައިވާ ފަރާތްތަކަށް ޚާއްޞަ ޕޯޓަލެކެވެ.'
    },
    english: {
      portalTitle: 'Ananda Recreation Club Portal',
      portalSub: 'Official Management & Member Self-Service Portal',
      badge: 'Official Portal Access',
      usernameLabel: 'Username',
      usernamePlaceholder: 'admin or member username',
      pinLabel: 'Security PIN (Numeric)',
      pinPlaceholder: '****',
      loginBtn: 'Sign In to Portal',
      loggingIn: 'Authenticating...',
      backToWeb: 'Return to Public Website',
      emptyError: 'Please enter both username and numeric PIN.',
      invalidError: 'Invalid username or security PIN.',
      quickFillTitle: 'Quick Login Presets:',
      adminRole: 'Admin Controller',
      excoRole: 'EXCO Member',
      memberRole: 'Club Member',
      securityNotice: 'Restricted system for authorized club officials and registered members.'
    }
  }[lang];

  const handleFillPreset = (user: string, pinCode: string) => {
    setUsername(user);
    setPin(pinCode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPin = pin.trim();

    if (!cleanUser || !cleanPin) {
      setError(t.emptyError);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(cleanUser, cleanPin);
      // Navigate cleanly to portal
      window.location.href = '/portal';
    } catch (err: any) {
      setError(err.message || t.invalidError);
    } finally {
      setLoading(false);
    }
  };

  const dir = lang === 'dhivehi' ? 'rtl' : 'ltr';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans" dir={dir}>
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher Bar at Top */}
      <div className="w-full max-w-md flex justify-end mb-3 z-10">
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 gap-1 shadow-lg" dir="ltr">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <button
            type="button"
            onClick={() => setLang('dhivehi')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              lang === 'dhivehi'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ދިވެހި
          </button>
          <button
            type="button"
            onClick={() => setLang('english')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              lang === 'english'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 z-10">
        
        {/* Brand & Portal Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-red-500 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-xl shadow-orange-500/25 border border-orange-400/30">
            ARC
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t.badge}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
              {t.portalTitle}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {t.portalSub}
            </p>
          </div>
        </div>

        {/* Quick Login Presets for Immediate Access */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-bold text-[11px]">
            <span className="flex items-center gap-1 text-orange-400">
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t.quickFillTitle}</span>
            </span>
            <span className="text-[10px] text-slate-500">1-Click Auto-Fill</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              id="autofill_admin_btn"
              onClick={() => handleFillPreset('admin', '2613')}
              className="px-2 py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 font-bold text-[11px] transition-all flex flex-col items-center gap-0.5 text-center cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-orange-400" />
              <span className="truncate w-full font-sans">Admin</span>
              <span className="text-[9px] text-slate-400 font-mono">2613</span>
            </button>

            <button
              type="button"
              id="autofill_exco_btn"
              onClick={() => handleFillPreset('exco_member', '1234')}
              className="px-2 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-[11px] transition-all flex flex-col items-center gap-0.5 text-center cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate w-full font-sans">EXCO</span>
              <span className="text-[9px] text-slate-400 font-mono">1234</span>
            </button>

            <button
              type="button"
              id="autofill_member_btn"
              onClick={() => handleFillPreset('member', '1111')}
              className="px-2 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] transition-all flex flex-col items-center gap-0.5 text-center cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate w-full font-sans">Member</span>
              <span className="text-[9px] text-slate-400 font-mono">1111</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Input */}
          <div className="space-y-1.5">
            <label htmlFor="login_username" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              {t.usernameLabel}
            </label>
            <div className="relative flex items-center">
              <div className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} text-slate-500 pointer-events-none`}>
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="login_username"
                type="text"
                required
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
                className={`w-full ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-colors font-mono`}
              />
            </div>
          </div>

          {/* Numeric PIN Input */}
          <div>
            <PinInput
              id="login_pin"
              value={pin}
              onChange={setPin}
              label={t.pinLabel}
              placeholder={t.pinPlaceholder}
              required
              maxLength={8}
            />
          </div>

          {error && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="login_submit_btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t.loggingIn}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>{t.loginBtn}</span>
              </div>
            )}
          </button>
        </form>

        {/* Footer info & Return to Website */}
        <div className="pt-3 border-t border-slate-800 space-y-3 text-center">
          <p className="text-[10px] text-slate-500">
            {t.securityNotice}
          </p>

          <a
            id="return_to_website_btn"
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-0' : 'rotate-180'}`} />
            <span>{t.backToWeb}</span>
          </a>
        </div>

      </div>
    </div>
  );
};



