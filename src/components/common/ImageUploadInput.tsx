import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadInputProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  placeholder = 'Select or drop an image file...',
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP, SVG, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase text-slate-400">
          {label} {required && <span className="text-orange-500">*</span>}
        </label>
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">File Upload Only</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="relative p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate"> Image File Uploaded</p>
            <p className="text-[10px] text-slate-400 font-mono truncate">{value.startsWith('data:') ? 'Local Image File (Base64)' : value}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Upload className="w-3 h-3 text-orange-400" />
                <span>Change File</span>
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-400 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors border border-red-800/40"
              >
                <X className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`p-4 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-orange-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Click to select image file <span className="text-orange-400">or drag & drop</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WEBP, or SVG image files</p>
          </div>
          {required && !value && (
            <input
              type="text"
              required
              value=""
              readOnly
              className="sr-only"
              tabIndex={-1}
            />
          )}
        </div>
      )}
    </div>
  );
};
