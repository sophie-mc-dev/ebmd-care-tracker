import React, { useState } from 'react';
import {
  Zap,
  Droplets,
  Moon,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Plus,
  Clock,
  Info,
  Monitor,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { EpisodeLog, TreatmentLog, RoutineItem, RoutineAnchor, TreatmentType } from '../types/ebmd';
import { getSkipReasonLabel } from '../utils/storage';
import { sound } from '../utils/audio';

interface TodayDashboardProps {
  episodes: EpisodeLog[];
  treatments: TreatmentLog[];
  routines: RoutineItem[];
  onOpenQuickEpisode: () => void;
  onOpenQuickTreatment: (type?: TreatmentType, anchor?: RoutineAnchor) => void;
  onQuickToggleRoutine: (routine: RoutineItem, skipped?: boolean) => void;
  onSaveDailyScreenTime: (hours: number) => void;
  onEditEpisode: (episode: EpisodeLog) => void;
  onEditTreatment: (treatment: TreatmentLog) => void;
  onNavigateToHistory: (filterToday?: boolean) => void;
  soundEnabled?: boolean;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  episodes,
  treatments,
  routines,
  onOpenQuickEpisode,
  onOpenQuickTreatment,
  onQuickToggleRoutine,
  onSaveDailyScreenTime,
  onEditEpisode,
  onEditTreatment,
  onNavigateToHistory,
  soundEnabled = true,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter logs for today
  const todayEpisodes = episodes.filter((ep) => ep.timestamp.startsWith(todayStr));
  const todayTreatments = treatments.filter((tr) => tr.timestamp.startsWith(todayStr));

  // Find most recent episode
  const sortedEpisodes = [...episodes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestEpisode = sortedEpisodes[0];

  // Calculate days since last episode
  const daysSinceLastEpisode = latestEpisode
    ? Math.floor((Date.now() - new Date(latestEpisode.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate 7-day adherence rate
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentTreatments = treatments.filter(
    (t) => new Date(t.timestamp).getTime() >= sevenDaysAgo
  );
  const completedRecent = recentTreatments.filter((t) => !t.skipped);
  const adherenceRate = recentTreatments.length > 0
    ? Math.round((completedRecent.length / recentTreatments.length) * 100)
    : 100;

  // Check which routine items have been logged today
  const routineStatus = routines.map((routine) => {
    const matchingLog = todayTreatments.find(
      (t) => t.anchor === routine.anchor || t.type === routine.type
    );
    return {
      routine,
      log: matchingLog,
      isDone: !!matchingLog && !matchingLog.skipped,
      isSkipped: !!matchingLog && matchingLog.skipped,
    };
  });

  const doneCount = routineStatus.filter((r) => r.isDone).length;
  const totalCount = routines.length;

  // Next undone routine item
  const nextUndoneItem = routineStatus.find((r) => !r.isDone && !r.isSkipped);

  // UI Progressive Disclosure States
  const [isInsightExpanded, setIsInsightExpanded] = useState(false);
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);

  // Screen time state
  const todayScreenLog = todayTreatments.find((t) => t.screenTimeHours !== undefined);
  const existingScreenHours = todayScreenLog?.screenTimeHours;
  const [screenHoursInput, setScreenHoursInput] = useState<number>(existingScreenHours ?? 6);
  const [isScreenTimeEditing, setIsScreenTimeEditing] = useState(false);

  // One-line status summary text
  const statusSummaryText = todayEpisodes.length > 0
    ? `${todayEpisodes.length} episode${todayEpisodes.length > 1 ? 's' : ''} logged today · ${adherenceRate}% adherence`
    : daysSinceLastEpisode !== null
    ? `${daysSinceLastEpisode} day${daysSinceLastEpisode === 1 ? '' : 's'} without an episode · ${adherenceRate}% adherence`
    : `Cornea calm · ${adherenceRate}% adherence`;

  return (
    <div className="space-y-4 pb-24 max-w-xl mx-auto px-4 sm:px-0">
      {/* Simplified One-Line Status Card with Progressive Disclosure */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setIsInsightExpanded(!isInsightExpanded);
            if (soundEnabled) sound.playGentleBeep(500, 0.04);
          }}
          className="w-full py-3.5 px-4 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition active:bg-slate-100 dark:active:bg-slate-800"
          aria-expanded={isInsightExpanded}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                todayEpisodes.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {statusSummaryText}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium flex-shrink-0">
            <span>{isInsightExpanded ? 'Hide' : 'Insight'}</span>
            {isInsightExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {/* Collapsed Clinical Insight & Bedtime Ointment Guidance */}
        {isInsightExpanded && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2.5 animate-in fade-in">
            {todayEpisodes.length > 0 ? (
              <p className="leading-relaxed">
                An episode was recorded today. Keep the eye rested, minimize screen exposure, and continue applying lubricating drops or ointment to promote epithelial adhesion.
              </p>
            ) : (
              <p className="leading-relaxed">
                Your corneal surface is stable. Consistent hypertonic drops and bedtime ointment protect the basement membrane from shearing against the eyelid during REM sleep and morning opening.
              </p>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Moon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Night ointment prevents morning adhesion</span>
              </span>
              <button
                type="button"
                onClick={() => onOpenQuickTreatment('ointment', 'before_bed')}
                className="text-teal-600 dark:text-teal-400 font-bold hover:underline"
              >
                Log Bedtime Dose
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Buttons: Daily Treatment & Acute Episode */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Treatment: Daily Care */}
        <button
          type="button"
          onClick={() => {
            if (soundEnabled) sound.playGentleBeep(520, 0.04);
            onOpenQuickTreatment();
          }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white shadow-md shadow-teal-600/20 transition min-h-[68px] sm:min-h-[58px]"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 text-left w-full sm:w-auto">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5 leading-tight">
                <span>Log Treatment</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold bg-white/20 px-1.5 py-0.5 rounded tracking-wide">
                  Daily
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-teal-100 font-normal mt-0.5 truncate sm:whitespace-normal">
                Drops, gel, ointment
              </div>
            </div>
          </div>
          <Plus className="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 text-teal-200 flex-shrink-0 ml-1" />
        </button>

        {/* Episode: Acute Flare-Up */}
        <button
          type="button"
          onClick={() => {
            if (soundEnabled) sound.playGentleBeep(420, 0.04);
            onOpenQuickEpisode();
          }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-md shadow-rose-600/20 transition min-h-[68px] sm:min-h-[58px]"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 text-left w-full sm:w-auto">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5 leading-tight">
                <span>Log Episode</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold bg-white/20 px-1.5 py-0.5 rounded tracking-wide">
                  &lt; 10s
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-rose-100 font-normal mt-0.5 truncate sm:whitespace-normal">
                Pain, tear, blur
              </div>
            </div>
          </div>
          <Plus className="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 text-rose-200 flex-shrink-0 ml-1" />
        </button>
      </div>

      {/* Daily Routine Checklist with Progressive Disclosure */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Daily Routine Checklist
            </h2>
          </div>

          {/* Toggle row: "X of Y done ⌄" */}
          <button
            type="button"
            onClick={() => {
              setIsChecklistExpanded(!isChecklistExpanded);
              if (soundEnabled) sound.playGentleBeep(520, 0.04);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>{doneCount} of {totalCount} done</span>
            {isChecklistExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* DEFAULT VIEW: Show ONLY next undone item with Take/Skip buttons */}
        {!isChecklistExpanded && nextUndoneItem && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {nextUndoneItem.routine.title}
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded">
                  Up next
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {nextUndoneItem.routine.anchorLabel} · <span className="italic">{nextUndoneItem.routine.productName}</span>
              </p>
            </div>

            {/* Take / Skip Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => onQuickToggleRoutine(nextUndoneItem.routine, false)}
                className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Take</span>
              </button>
              <button
                type="button"
                onClick={() => onQuickToggleRoutine(nextUndoneItem.routine, true)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-medium transition min-h-[44px]"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* If all items are completed and collapsed */}
        {!isChecklistExpanded && !nextUndoneItem && (
          <div className="py-3 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>All {totalCount} routine items completed today!</span>
            </span>
            <button
              type="button"
              onClick={() => setIsChecklistExpanded(true)}
              className="font-bold underline"
            >
              Review all
            </button>
          </div>
        )}

        {/* EXPANDED VIEW: Shows all items */}
        {isChecklistExpanded && (
          <div className="space-y-2 pt-1 animate-in fade-in">
            {routineStatus.map(({ routine, log, isDone, isSkipped }) => (
              <div
                key={routine.id}
                className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                  isDone
                    ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30 text-slate-900 dark:text-white'
                    : isSkipped
                    ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30 text-slate-700 dark:text-slate-300'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{routine.title}</span>
                    {isDone && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ Done
                      </span>
                    )}
                    {isSkipped && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        Skipped ({getSkipReasonLabel(log?.skipReason)})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {routine.anchorLabel} · <span className="italic">{routine.productName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isDone && !isSkipped ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onQuickToggleRoutine(routine, false)}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold shadow-sm transition flex items-center gap-1 min-h-[40px]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Take</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickToggleRoutine(routine, true)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-medium transition min-h-[40px]"
                      >
                        Skip
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (log) onEditTreatment(log);
                        else onOpenQuickTreatment(routine.type, routine.anchor);
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-teal-600 dark:hover:text-teal-300 underline py-1 min-h-[36px]"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Once-Per-Day Screen Time Prompt (Moved out of Treatment Modal) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm transition space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Daily Screen Exposure
            </h3>
          </div>

          {existingScreenHours !== undefined && !isScreenTimeEditing ? (
            <button
              type="button"
              onClick={() => setIsScreenTimeEditing(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              {existingScreenHours} hrs logged · Edit
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-medium">1x / day</span>
          )}
        </div>

        {existingScreenHours === undefined || isScreenTimeEditing ? (
          <div className="pt-1 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Hours in front of screens today:</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {screenHoursInput} hrs
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="16"
                step="0.5"
                value={screenHoursInput}
                onChange={(e) => setScreenHoursInput(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <button
                type="button"
                onClick={() => {
                  onSaveDailyScreenTime(screenHoursInput);
                  setIsScreenTimeEditing(false);
                  if (soundEnabled) sound.playGentleBeep(620, 0.08);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1 min-h-[36px]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
              <span>0h</span>
              <span>4h</span>
              <span>8h (Work)</span>
              <span>12h+</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Clean Link to View Today's Activity in History (No duplicate list on Home) */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => onNavigateToHistory(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline py-2"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>View today's activity in History →</span>
        </button>
      </div>
    </div>
  );
};
