import React from 'react';
import { ShieldCheck, Moon, Sun, Settings, FileText, Zap } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { AppSettings } from '../types/ebmd';

interface HeaderProps {
  settings: AppSettings;
  isDark?: boolean;
  onToggleTheme: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  onQuickEpisode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  isDark,
  onToggleTheme,
  onOpenReport,
  onOpenSettings,
  onQuickEpisode,
}) => {
  const effectiveIsDark = isDark !== undefined ? isDark : settings.theme === 'dark';
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Eye shield */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-500/20">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">
                EBMD Tracker
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                PWA
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block leading-none mt-0.5">
              Corneal Care & Dystrophy Log
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Quick Doctor Report Export */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition active:scale-95 min-h-[38px]"
            title="Generate Doctor Appointment Report"
          >
            <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Report</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            title={`Switch to ${effectiveIsDark ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${effectiveIsDark ? 'light' : 'dark'} mode`}
          >
            {effectiveIsDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            )}
          </button>

          {/* Settings / Backup */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95 min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Preferences & Backup"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
