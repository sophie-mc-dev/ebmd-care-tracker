import React, { useState } from 'react';
import {
  Settings,
  BellRing,
  DollarSign,
  User,
  Sliders,
  Database,
  Moon,
  Sun,
  Monitor,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Check,
  Tag,
  FileText,
} from 'lucide-react';
import {
  ReminderSetting,
  AppSettings,
  ExpenseItem,
  RoutineItem,
} from '../types/ebmd';
import { RemindersSettings } from './RemindersSettings';
import { CostTracker } from './CostTracker';
import { ProductsSettings } from './ProductsSettings';
import {
  exportAllDataAsJSON,
  importAllDataFromJSON,
  resetToSampleData,
  clearAllData,
} from '../utils/storage';

export type SettingsSection = 'routine' | 'products' | 'costs' | 'profile' | 'backup';

interface SettingsHubProps {
  reminders: ReminderSetting[];
  settings: AppSettings;
  expenses: ExpenseItem[];
  defaultSection?: SettingsSection;
  onUpdateReminder: (updated: ReminderSetting) => void;
  onAddReminder: (newReminder: ReminderSetting) => void;
  onDeleteReminder: (id: string) => void;
  onUpdateSettings: (updatedSettings: AppSettings) => void;
  onSaveExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onDataReset: () => void;
  onOpenReport?: () => void;
}

export const SettingsHub: React.FC<SettingsHubProps> = ({
  reminders,
  settings,
  expenses,
  defaultSection = 'routine',
  onUpdateReminder,
  onAddReminder,
  onDeleteReminder,
  onUpdateSettings,
  onSaveExpense,
  onDeleteExpense,
  onDataReset,
  onOpenReport,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(defaultSection);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        setBackupStatus('Backup restored successfully!');
        onDataReset();
        setTimeout(() => setBackupStatus(null), 3000);
      } else {
        setBackupStatus('Failed to restore file. Invalid JSON format.');
        setTimeout(() => setBackupStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 sm:px-0">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              App & Care Settings
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your care routine, expenses, and data
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Top Bar for Settings */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSection('routine')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
            activeSection === 'routine'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>Routine</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('products')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
            activeSection === 'products'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Products</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('costs')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
            activeSection === 'costs'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Costs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('profile')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
            activeSection === 'profile'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Doctor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('backup')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
            activeSection === 'backup'
              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Backup</span>
        </button>
      </div>

      {/* Section 1: Routine & Anchors */}
      {activeSection === 'routine' && (
        <RemindersSettings
          reminders={reminders}
          settings={settings}
          onUpdateReminder={onUpdateReminder}
          onAddReminder={onAddReminder}
          onDeleteReminder={onDeleteReminder}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* Section 2: Configured Products & Brands */}
      {activeSection === 'products' && (
        <ProductsSettings
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          soundEnabled={settings.soundEnabled}
        />
      )}

      {/* Section 2: Eye Care Costs & Expenses */}
      {activeSection === 'costs' && (
        <CostTracker
          expenses={expenses}
          onSaveExpense={onSaveExpense}
          onDeleteExpense={onDeleteExpense}
          soundEnabled={settings.soundEnabled}
        />
      )}

      {/* Section 3: Profile & Comfort */}
      {activeSection === 'profile' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Medical & Doctor Report Details</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These details automatically populate your printable report for corneal appointments.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Your Name / Patient ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={settings.patientName || ''}
                  onChange={(e) => onUpdateSettings({ ...settings, patientName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Cornea Specialist / Doctor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Vance, MD"
                    value={settings.doctorName || ''}
                    onChange={(e) => onUpdateSettings({ ...settings, doctorName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Clinic / Eye Center
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Regional Eye Clinic"
                    value={settings.clinicName || ''}
                    onChange={(e) => onUpdateSettings({ ...settings, clinicName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              {onOpenReport && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenReport}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 text-xs font-bold transition shadow-xs"
                  >
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Generate Clinical PDF Report</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Visual Comfort */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Moon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Visual Comfort & Photophobia Mode</span>
            </h3>

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
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">High ambient lighting</div>
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
        </div>
      )}

      {/* Section 4: Data & Backup */}
      {activeSection === 'backup' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Local Storage & Backup Privacy</span>
            </h3>

            <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <p>
                Your medical logs and photos stay 100% private in your device's browser memory (IndexedDB & LocalStorage). No accounts or third-party cloud servers.
              </p>
            </div>

            {backupStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">
                {backupStatus}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleDownloadBackup}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 min-h-[46px]"
              >
                <Download className="w-4 h-4 text-teal-600" />
                <span>Export JSON Backup File</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 min-h-[46px]"
              >
                <Upload className="w-4 h-4 text-teal-600" />
                <span>Restore from JSON File</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  if (confirm('Load realistic sample data? Perfect for testing trends and charts.')) {
                    resetToSampleData();
                    onDataReset();
                  }
                }}
                className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Demonstration Data</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Delete all logged episodes, treatments, and costs? Make sure you have a JSON backup first.')) {
                    clearAllData();
                    onDataReset();
                  }
                }}
                className="text-rose-500 hover:underline flex items-center gap-1 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
