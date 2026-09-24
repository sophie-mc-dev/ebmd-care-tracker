/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  initStorageIfEmpty,
  loadEpisodes,
  saveEpisodes,
  loadTreatments,
  saveTreatments,
  loadExpenses,
  saveExpenses,
  loadRoutines,
  saveRoutines,
  loadReminders,
  saveReminders,
  loadSettings,
  saveSettings,
} from './utils/storage';
import {
  EpisodeLog,
  TreatmentLog,
  ExpenseItem,
  RoutineItem,
  ReminderSetting,
  AppSettings,
  TreatmentType,
  RoutineAnchor,
} from './types/ebmd';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TodayDashboard } from './components/TodayDashboard';
import { HistoryView } from './components/HistoryView';
import { TrendsDashboard } from './components/TrendsDashboard';
import { SettingsHub, SettingsSection } from './components/SettingsHub';
import { QuickEpisodeModal } from './components/QuickEpisodeModal';
import { QuickTreatmentModal } from './components/QuickTreatmentModal';
import { DoctorReportModal } from './components/DoctorReportModal';
import { SettingsBackupModal } from './components/SettingsBackupModal';
import { sound } from './utils/audio';

export default function App() {
  // App State
  const [episodes, setEpisodes] = useState<EpisodeLog[]>([]);
  const [treatments, setTreatments] = useState<TreatmentLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [reminders, setReminders] = useState<ReminderSetting[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [settingsDefaultSection, setSettingsDefaultSection] = useState<SettingsSection>('routine');

  // Track currently active resolved theme for UI icons and sync
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const initial = loadSettings();
    if (initial.theme === 'dark') return true;
    if (initial.theme === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true;
  });

  // Modal States
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<EpisodeLog | null>(null);

  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<TreatmentLog | null>(null);
  const [preselectedTreatmentType, setPreselectedTreatmentType] = useState<TreatmentType | undefined>();
  const [preselectedTreatmentAnchor, setPreselectedTreatmentAnchor] = useState<RoutineAnchor | undefined>();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Initialize data on mount
  const refreshAllState = useCallback(() => {
    initStorageIfEmpty();
    setEpisodes(loadEpisodes());
    setTreatments(loadTreatments());
    setExpenses(loadExpenses());
    setRoutines(loadRoutines());
    setReminders(loadReminders());
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    refreshAllState();
  }, [refreshAllState]);

  // Sync theme with DOM root class and handle system preference changes
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && mediaQuery.matches);

      setIsDarkTheme(isDark);

      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }

      // Sync PWA theme-color meta tag
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#020617' : '#0f766e');
      }
    };

    applyTheme();

    if (settings.theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [settings.theme]);

  // Background reminder scheduler check
  useEffect(() => {
    if (!settings.remindersEnabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDate = now.toISOString().split('T')[0];

      reminders.forEach((rem) => {
        if (!rem.enabled) return;
        if (rem.approxTime === currentHHMM) {
          const alertKey = `ebmd_alerted_${rem.id}_${todayDate}_${currentHHMM}`;
          if (!sessionStorage.getItem(alertKey)) {
            sessionStorage.setItem(alertKey, 'true');
            if (settings.soundEnabled) sound.playReminderChime();

            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(`EBMD Routine: ${rem.label}`, {
                body: rem.description,
                icon: '/pwa-192x192.png',
                badge: '/icon.svg',
              });
            }
          }
        }
      });
    }, 45000); // Check every 45s

    return () => clearInterval(interval);
  }, [reminders, settings.remindersEnabled, settings.soundEnabled]);

  // Handlers: Episode
  const handleSaveEpisode = (episode: EpisodeLog) => {
    setEpisodes((prev) => {
      const exists = prev.some((e) => e.id === episode.id);
      const updated = exists ? prev.map((e) => (e.id === episode.id ? episode : e)) : [episode, ...prev];
      saveEpisodes(updated);
      return updated;
    });
  };

  const handleDeleteEpisode = (id: string) => {
    setEpisodes((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveEpisodes(updated);
      return updated;
    });
  };

  // Handlers: Treatment
  const handleSaveTreatment = (treatment: TreatmentLog) => {
    setTreatments((prev) => {
      const exists = prev.some((t) => t.id === treatment.id);
      const updated = exists ? prev.map((t) => (t.id === treatment.id ? treatment : t)) : [treatment, ...prev];
      saveTreatments(updated);
      return updated;
    });
  };

  const handleDeleteTreatment = (id: string) => {
    setTreatments((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTreatments(updated);
      return updated;
    });
  };

  // State to filter history to a specific date (e.g. today when navigating from Home)
  const [historySelectedDate, setHistorySelectedDate] = useState<string | null>(null);

  // Fast 1-tap routine checklist toggle from Today Dashboard
  const handleQuickToggleRoutine = (routine: RoutineItem, skipped = false) => {
    const newLog: TreatmentLog = {
      id: `treat_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: routine.type,
      productName: routine.productName,
      eye: routine.eye,
      anchor: routine.anchor,
      skipped,
      skipReason: skipped ? 'forgot' : undefined,
    };

    if (settings.soundEnabled) sound.playGentleBeep(skipped ? 380 : 560, 0.1);
    handleSaveTreatment(newLog);
  };

  // Daily screen time logging once per day from Home
  const handleSaveDailyScreenTime = (hours: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const existingScreenTimeLog = treatments.find(
      (t) => t.timestamp.startsWith(todayStr) && t.screenTimeHours !== undefined
    );

    if (existingScreenTimeLog) {
      handleSaveTreatment({
        ...existingScreenTimeLog,
        screenTimeHours: hours,
      });
    } else {
      const screenLog: TreatmentLog = {
        id: `treat_screen_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'other',
        productName: 'Screen Exposure Log',
        eye: 'OU',
        anchor: 'before_bed',
        skipped: false,
        screenTimeHours: hours,
        notes: `Logged ${hours} hrs daily screen time`,
      };
      handleSaveTreatment(screenLog);
    }
  };

  // Handlers: Expense
  const handleSaveExpense = (expense: ExpenseItem) => {
    setExpenses((prev) => {
      const exists = prev.some((e) => e.id === expense.id);
      const updated = exists ? prev.map((e) => (e.id === expense.id ? expense : e)) : [expense, ...prev];
      saveExpenses(updated);
      return updated;
    });
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveExpenses(updated);
      return updated;
    });
  };

  // Handlers: Reminders
  const handleUpdateReminder = (updated: ReminderSetting) => {
    setReminders((prev) => {
      const next = prev.map((r) => (r.id === updated.id ? updated : r));
      saveReminders(next);
      return next;
    });
  };

  const handleAddReminder = (newReminder: ReminderSetting) => {
    setReminders((prev) => {
      const next = [...prev, newReminder];
      saveReminders(next);
      return next;
    });
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveReminders(next);
      return next;
    });
  };

  // Handlers: Settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleToggleTheme = () => {
    const nextTheme = isDarkTheme ? 'light' : 'dark';
    handleUpdateSettings({ ...settings, theme: nextTheme });
  };

  // Fast modal openers
  const openNewEpisode = () => {
    setEditingEpisode(null);
    setIsEpisodeModalOpen(true);
  };

  const openNewTreatment = (type?: TreatmentType, anchor?: RoutineAnchor) => {
    setEditingTreatment(null);
    setPreselectedTreatmentType(type);
    setPreselectedTreatmentAnchor(anchor);
    setIsTreatmentModalOpen(true);
  };

  const openProductsSettings = () => {
    setSettingsDefaultSection('products');
    setActiveTab('settings');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Offline Alert Indicator */}
      <OfflineIndicator />

      {/* Top Header */}
      <Header
        settings={settings}
        isDark={isDarkTheme}
        onToggleTheme={handleToggleTheme}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onQuickEpisode={openNewEpisode}
      />

      {/* Main Content Area */}
      <main className="flex-1 py-5">
        {activeTab === 'today' && (
          <TodayDashboard
            episodes={episodes}
            treatments={treatments}
            routines={routines}
            onOpenQuickEpisode={openNewEpisode}
            onOpenQuickTreatment={openNewTreatment}
            onQuickToggleRoutine={handleQuickToggleRoutine}
            onSaveDailyScreenTime={handleSaveDailyScreenTime}
            onEditEpisode={(ep) => {
              setEditingEpisode(ep);
              setIsEpisodeModalOpen(true);
            }}
            onEditTreatment={(tr) => {
              setEditingTreatment(tr);
              setIsTreatmentModalOpen(true);
            }}
            onNavigateToHistory={(filterToday) => {
              if (filterToday) {
                setHistorySelectedDate(new Date().toISOString().split('T')[0]);
              } else {
                setHistorySelectedDate(null);
              }
              setActiveTab('history');
            }}
            soundEnabled={settings.soundEnabled}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            episodes={episodes}
            treatments={treatments}
            selectedDate={historySelectedDate}
            onSelectDate={setHistorySelectedDate}
            onEditEpisode={(ep) => {
              setEditingEpisode(ep);
              setIsEpisodeModalOpen(true);
            }}
            onDeleteEpisode={handleDeleteEpisode}
            onEditTreatment={(tr) => {
              setEditingTreatment(tr);
              setIsTreatmentModalOpen(true);
            }}
            onDeleteTreatment={handleDeleteTreatment}
            onAddEpisode={openNewEpisode}
            onAddTreatment={() => openNewTreatment('drops')}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsDashboard episodes={episodes} treatments={treatments} />
        )}

        {activeTab === 'settings' && (
          <SettingsHub
            reminders={reminders}
            settings={settings}
            expenses={expenses}
            defaultSection={settingsDefaultSection}
            onUpdateReminder={handleUpdateReminder}
            onAddReminder={handleAddReminder}
            onDeleteReminder={handleDeleteReminder}
            onUpdateSettings={handleUpdateSettings}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
            onDataReset={refreshAllState}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onQuickEpisode={openNewEpisode}
      />

      {/* Modals */}
      <QuickEpisodeModal
        isOpen={isEpisodeModalOpen}
        onClose={() => setIsEpisodeModalOpen(false)}
        onSave={handleSaveEpisode}
        initialData={editingEpisode}
        soundEnabled={settings.soundEnabled}
      />

      <QuickTreatmentModal
        isOpen={isTreatmentModalOpen}
        onClose={() => setIsTreatmentModalOpen(false)}
        onSave={handleSaveTreatment}
        initialData={editingTreatment}
        soundEnabled={settings.soundEnabled}
        preselectedType={preselectedTreatmentType}
        preselectedAnchor={preselectedTreatmentAnchor}
        configuredProducts={settings.configuredProducts}
        onManageProducts={openProductsSettings}
      />

      <DoctorReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        episodes={episodes}
        treatments={treatments}
        expenses={expenses}
        settings={settings}
      />

      <SettingsBackupModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onDataReset={refreshAllState}
        onNavigateToProducts={openProductsSettings}
      />
    </div>
  );
}
