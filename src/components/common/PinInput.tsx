import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PinInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  maxLength?: number;
  autoFocus?: boolean;
  required?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
  id = 'pin_input',
  value,
  onChange,
  placeholder = '****',
  label,
  error,
  maxLength = 8,
  autoFocus = false,
  required = false
}) => {
  const [showPin, setShowPin] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericOnly = e.target.value.replace(/\D/g, '').slice(0, maxLength);
    onChange(numericOnly);
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <div className="absolute right-3 text-slate-500 pointer-events-none">
          <Lock className="w-4 h-4" />
        </div>
        <input
          id={id}
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="current-password"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={maxLength}
          required={required}
          className={`w-full pr-10 pl-12 py-2.5 bg-slate-950 border rounded-xl font-mono text-base tracking-widest text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-all ${
            error ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-800'
          }`}
        />
        <button
          id={`${id}_toggle_show`}
          type="button"
          onClick={() => setShowPin(!showPin)}
          className="absolute left-3 p-1.5 text-slate-500 hover:text-slate-300 rounded-lg transition-colors"
          title={showPin ? 'Hide PIN' : 'Show PIN'}
        >
          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
