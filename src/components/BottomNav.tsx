import React from 'react';
import { Clock, Calendar, TrendingUp, Settings, Zap } from 'lucide-react';

export type NavTab = 'today' | 'history' | 'trends' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  onQuickEpisode: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onQuickEpisode,
}) => {
  return (
    <nav className="print:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 pb-safe">
      <div className="max-w-md mx-auto px-4 py-1.5 flex items-center justify-between relative">
        {/* Tab 1: Today */}
        <button
          onClick={() => onChangeTab('today')}
          className={`w-16 flex flex-col items-center py-1.5 rounded-2xl transition min-h-[48px] justify-center active:scale-95 ${
            activeTab === 'today'
              ? 'text-teal-600 dark:text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Today</span>
        </button>

        {/* Tab 2: History */}
        <button
          onClick={() => onChangeTab('history')}
          className={`w-16 flex flex-col items-center py-1.5 rounded-2xl transition min-h-[48px] justify-center active:scale-95 ${
            activeTab === 'history'
              ? 'text-teal-600 dark:text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">History</span>
        </button>

        {/* Center Floating Quick-Action for Fast Episode Log Under 10s */}
        <div className="flex justify-center -mt-6">
          <button
            onClick={onQuickEpisode}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xl shadow-rose-600/40 flex flex-col items-center justify-center transition transform active:scale-90 ring-4 ring-white dark:ring-slate-950"
            title="Rapid Episode Log (<10s)"
          >
            <Zap className="w-6 h-6 fill-white" />
            <span className="text-[8px] font-black uppercase tracking-tight -mt-0.5">Log</span>
          </button>
        </div>

        {/* Tab 3: Trends */}
        <button
          onClick={() => onChangeTab('trends')}
          className={`w-16 flex flex-col items-center py-1.5 rounded-2xl transition min-h-[48px] justify-center active:scale-95 ${
            activeTab === 'trends'
              ? 'text-teal-600 dark:text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Trends</span>
        </button>

        {/* Tab 4: Settings Hub (houses Routine & Reminders, Costs, Preferences, and Data Backup) */}
        <button
          onClick={() => onChangeTab('settings')}
          className={`w-16 flex flex-col items-center py-1.5 rounded-2xl transition min-h-[48px] justify-center active:scale-95 ${
            activeTab === 'settings'
              ? 'text-teal-600 dark:text-teal-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Settings</span>
        </button>
      </div>
    </nav>
  );
};

