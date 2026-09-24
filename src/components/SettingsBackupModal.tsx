import React, { useState, useRef } from 'react';
import {
  Settings,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Eye,
  Check,
  X,
  Shield,
  FileJson,
  User,
  Tag,
} from 'lucide-react';
import { AppSettings } from '../types/ebmd';
import { exportAllDataAsJSON, importAllDataFromJSON, resetToSampleData, clearAllData } from '../utils/storage';

interface SettingsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onDataReset: () => void;
  onNavigateToProducts?: () => void;
}

export const SettingsBackupModal: React.FC<SettingsBackupModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onDataReset,
  onNavigateToProducts,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const jsonStr = exportAllDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ebmd-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importAllDataFromJSON(content);
      if (success) {
        setImportStatus('Backup restored successfully!');
        onDataReset();
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Failed to restore file. Invalid JSON format.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Preferences & Data Backup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Local storage, visual comfort, and JSON export
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Comfort Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Eye Comfort & Visual Theme
          </h3>

          {/* Theme selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
              className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                settings.theme === 'dark'
                  ? 'border-teal-500 bg-teal-500/10 text-teal-800 dark:text-teal-300 font-bold ring-2 ring-teal-500/30'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Moon className="w-4 h-4 text-teal-500 shrink-0" />
              <div>
                <div className="text-xs font-bold">Dark Mode</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Protects sensitive eyes</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
              className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                settings.theme === 'light'
                  ? 'border-teal-500 bg-teal-500/10 text-teal-800 dark:text-teal-300 font-bold ring-2 ring-teal-500/30'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="text-xs font-bold">Light Mode</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">High ambient light</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: 'system' })}
              className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                settings.theme === 'system'
                  ? 'border-teal-500 bg-teal-500/10 text-teal-800 dark:text-teal-300 font-bold ring-2 ring-teal-500/30'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Monitor className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <div className="text-xs font-bold">System Auto</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Match device theme</div>
              </div>
            </button>
          </div>
        </div>

        {/* Default Products & Brands */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Default Products & Brands
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Customize drop, gel, and ointment brands for quick logging
              </p>
            </div>
            {onNavigateToProducts && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToProducts();
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-xs border border-teal-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Configure Brands</span>
              </button>
            )}
          </div>
        </div>

        {/* Clinical Info for Doctor Export */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Doctor Report Details (Optional)
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Your Name / Patient ID
              </label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={settings.patientName || ''}
                onChange={(e) => onUpdateSettings({ ...settings, patientName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Doctor / Specialist
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Vance, Cornea"
                  value={settings.doctorName || ''}
                  onChange={(e) => onUpdateSettings({ ...settings, doctorName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Clinic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eye Specialty Center"
                  value={settings.clinicName || ''}
                  onChange={(e) => onUpdateSettings({ ...settings, clinicName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Local Data Privacy & Backup */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Local Data & JSON Backup
          </h3>

          <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2">
            <Shield className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p>
              Your medical logs stay 100% private on your own device. No account, no cloud servers, and no tracking. Export a local JSON backup at any time.
            </p>
          </div>

          {importStatus && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">
              {importStatus}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadBackup}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <Download className="w-4 h-4 text-teal-600" />
              <span>Export JSON Backup</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <Upload className="w-4 h-4 text-teal-600" />
              <span>Restore from JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Reset / Sample Data */}
          <div className="pt-2 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                if (confirm('Load realistic sample data? This is great for exploring trends and reports.')) {
                  resetToSampleData();
                  onDataReset();
                }
              }}
              className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Sample Data</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all logged episodes and treatments? This cannot be undone unless you have a JSON backup.')) {
                  clearAllData();
                  onDataReset();
                }
              }}
              className="text-rose-500 hover:underline flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow transition"
        >
          Done
        </button>
      </div>
    </div>
  );
};
