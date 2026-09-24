import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  Volume2,
  VolumeX,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Info,
  Shield,
  Smartphone,
} from 'lucide-react';
import { ReminderSetting, RoutineAnchor, AppSettings } from '../types/ebmd';
import { sound } from '../utils/audio';

interface RemindersSettingsProps {
  reminders: ReminderSetting[];
  settings: AppSettings;
  onUpdateReminder: (updated: ReminderSetting) => void;
  onAddReminder: (newReminder: ReminderSetting) => void;
  onDeleteReminder: (id: string) => void;
  onUpdateSettings: (updatedSettings: AppSettings) => void;
}

export const RemindersSettings: React.FC<RemindersSettingsProps> = ({
  reminders,
  settings,
  onUpdateReminder,
  onAddReminder,
  onDeleteReminder,
  onUpdateSettings,
}) => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [showAddAnchor, setShowAddAnchor] = useState(false);

  // New anchor form
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTime, setNewTime] = useState('15:00');

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('Notifications are not supported on this browser.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        sendTestNotification();
      }
    } catch (err) {
      console.error('Permission request error', err);
    }
  };

  const sendTestNotification = () => {
    sound.playReminderChime();

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('EBMD Eye-Care Reminder', {
        body: 'Time for Bedtime Corneal Shield Ointment — Protect your cornea before sleep!',
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
      });
    }

    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  const handleAddAnchor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const item: ReminderSetting = {
      id: `rem_${Date.now()}`,
      anchor: 'as_needed',
      label: newLabel.trim(),
      approxTime: newTime,
      description: newDesc.trim() || 'Custom routine reminder',
      enabled: true,
    };

    onAddReminder(item);
    setNewLabel('');
    setNewDesc('');
    setShowAddAnchor(false);
  };

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Routine Anchor Reminders
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tied to your daily habits (meals & bedtime) rather than rigid clocks
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
          <strong>Why anchor reminders?</strong> Studies show that tying eye drops and ointments to natural routine events ("after lunch", "right before lights out") achieves far higher adherence than strict alarms.
        </p>
      </div>

      {/* Browser Notification Permissions Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-teal-600" />
              <span>Browser & Device Notifications</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Status:{' '}
              <span className="font-bold uppercase text-teal-600 dark:text-teal-400">
                {notificationPermission}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {notificationPermission !== 'granted' ? (
              <button
                onClick={requestNotificationPermission}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition shadow-sm min-h-[40px]"
              >
                Enable Notifications
              </button>
            ) : (
              <button
                onClick={sendTestNotification}
                className="px-3 py-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{testNotificationSent ? 'Sent!' : 'Test Sound & Alert'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio chime toggle */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>Gentle Harmonic Audio Chimes</span>
          </div>
          <button
            onClick={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.soundEnabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Routine Anchors List */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Configured Anchors ({reminders.length})
          </h3>
          <button
            onClick={() => setShowAddAnchor(!showAddAnchor)}
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Anchor</span>
          </button>
        </div>

        {/* Add custom anchor form */}
        {showAddAnchor && (
          <form
            onSubmit={handleAddAnchor}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-teal-500/30 space-y-3 text-xs animate-in fade-in"
          >
            <h4 className="font-bold text-slate-900 dark:text-white">New Habit Anchor</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Anchor Name (e.g. "After morning coffee") *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3PM Screen Break"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Approximate Notification Time
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Description / Medication
              </label>
              <input
                type="text"
                placeholder="e.g. Instill chilled preservative-free tears"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddAnchor(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-teal-600 text-white font-bold"
              >
                Save Anchor
              </button>
            </div>
          </form>
        )}

        {/* Anchors items */}
        <div className="space-y-3">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                rem.enabled
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  : 'bg-slate-100/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {rem.label}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300">
                    ~{rem.approxTime}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {rem.description}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => onUpdateReminder({ ...rem, enabled: !rem.enabled })}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    rem.enabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      rem.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>

                {rem.id.startsWith('rem_') && !['rem_waking', 'rem_lunch', 'rem_bed'].includes(rem.id) && (
                  <button
                    onClick={() => onDeleteReminder(rem.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
