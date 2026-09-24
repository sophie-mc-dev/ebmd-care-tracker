import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Zap,
  Droplets,
  Moon,
  Trash2,
  Edit2,
  Search,
  AlertTriangle,
  X,
  Plus,
  Camera,
  CloudSun,
  Monitor,
  Check,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { EpisodeLog, TreatmentLog, EyeTarget } from '../types/ebmd';
import {
  getSeverityLabel,
  getEyeShort,
  getAnchorLabel,
  getSkipReasonLabel,
  getSymptomLabel,
} from '../utils/storage';

interface HistoryViewProps {
  episodes: EpisodeLog[];
  treatments: TreatmentLog[];
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  onEditEpisode: (episode: EpisodeLog) => void;
  onDeleteEpisode: (id: string) => void;
  onEditTreatment: (treatment: TreatmentLog) => void;
  onDeleteTreatment: (id: string) => void;
  onAddEpisode: () => void;
  onAddTreatment: () => void;
}

type FilterType = 'all' | 'episodes' | 'treatments' | 'skipped';
type DateRangeOption = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';

export const HistoryView: React.FC<HistoryViewProps> = ({
  episodes,
  treatments,
  selectedDate = null,
  onSelectDate,
  onEditEpisode,
  onDeleteEpisode,
  onEditTreatment,
  onDeleteTreatment,
  onAddEpisode,
  onAddTreatment,
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(selectedDate);

  // Sync when selectedDate changes (e.g. navigated from Home with "Today")
  useEffect(() => {
    if (selectedDate !== undefined) {
      setSelectedCalendarDate(selectedDate);
      if (selectedDate) {
        const d = new Date(`${selectedDate}T12:00:00`);
        if (!isNaN(d.getTime())) {
          setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      }
    }
  }, [selectedDate]);

  // Combine and sort events
  const allEvents = useMemo(() => {
    type UnifiedEvent =
      | { kind: 'episode'; data: EpisodeLog; timestamp: string }
      | { kind: 'treatment'; data: TreatmentLog; timestamp: string };

    const list: UnifiedEvent[] = [];

    episodes.forEach((ep) => {
      list.push({ kind: 'episode', data: ep, timestamp: ep.timestamp });
    });

    treatments.forEach((tr) => {
      list.push({ kind: 'treatment', data: tr, timestamp: tr.timestamp });
    });

    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [episodes, treatments]);

  // Filter based on controls
  const filteredEvents = useMemo(() => {
    const now = Date.now();
    let minTime = 0;
    let maxTime = Number.MAX_SAFE_INTEGER;
    const todayStr = new Date().toISOString().split('T')[0];

    if (dateRange === 'today') {
      minTime = new Date(`${todayStr}T00:00:00`).getTime();
      maxTime = new Date(`${todayStr}T23:59:59`).getTime();
    } else if (dateRange === '7d') {
      minTime = now - 7 * 24 * 60 * 60 * 1000;
    } else if (dateRange === '30d') {
      minTime = now - 30 * 24 * 60 * 60 * 1000;
    } else if (dateRange === '90d') {
      minTime = now - 90 * 24 * 60 * 60 * 1000;
    } else if (dateRange === 'custom') {
      if (customStart) minTime = new Date(`${customStart}T00:00:00`).getTime();
      if (customEnd) maxTime = new Date(`${customEnd}T23:59:59`).getTime();
    }

    return allEvents.filter((item) => {
      const itemTime = new Date(item.timestamp).getTime();
      if (itemTime < minTime || itemTime > maxTime) return false;

      // Calendar day filter (if user tapped a day in calendar)
      if (selectedCalendarDate) {
        if (!item.timestamp.startsWith(selectedCalendarDate)) return false;
      }

      // Filter type
      if (filterType === 'episodes' && item.kind !== 'episode') return false;
      if (filterType === 'treatments' && item.kind !== 'treatment') return false;
      if (filterType === 'skipped' && (item.kind !== 'treatment' || !item.data.skipped)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (item.kind === 'episode') {
          const ep = item.data;
          const matchNote = ep.notes?.toLowerCase().includes(q);
          const matchTrigger = ep.trigger?.toLowerCase().includes(q);
          const matchAction = ep.actionTaken?.toLowerCase().includes(q);
          const matchSymptom = ep.symptoms?.some((s) => s.toLowerCase().includes(q));
          return !!(matchNote || matchTrigger || matchAction || matchSymptom);
        } else {
          const tr = item.data;
          const matchName = tr.productName.toLowerCase().includes(q);
          const matchNote = tr.notes?.toLowerCase().includes(q);
          const matchReason =
            tr.skipReason?.toLowerCase().includes(q) ||
            tr.skipReasonCustom?.toLowerCase().includes(q);
          return !!(matchName || matchNote || matchReason);
        }
      }

      return true;
    });
  }, [allEvents, dateRange, customStart, customEnd, filterType, searchQuery, selectedCalendarDate]);

  // Calendar grid calculations
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: {
      dateStr: string;
      dayNum: number;
      episodes: EpisodeLog[];
      treatments: TreatmentLog[];
    }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEpisodes = episodes.filter((e) => e.timestamp.startsWith(dateStr));
      const dayTreatments = treatments.filter((t) => t.timestamp.startsWith(dateStr));
      days.push({ dateStr, dayNum: day, episodes: dayEpisodes, treatments: dayTreatments });
    }

    return { firstDayIndex, days };
  }, [currentMonth, episodes, treatments]);

  // Group filtered events by date
  const groupedEvents = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    filteredEvents.forEach((ev) => {
      const dateKey = ev.timestamp.split('T')[0];
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(ev);
    });
    return Array.from(map.entries());
  }, [filteredEvents]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Active filter count
  const activeFiltersCount =
    (dateRange !== 'all' ? 1 : 0) +
    (filterType !== 'all' ? 1 : 0) +
    (selectedCalendarDate ? 1 : 0);

  const handleSelectCalendarDay = (dateStr: string) => {
    const nextVal = selectedCalendarDate === dateStr ? null : dateStr;
    setSelectedCalendarDate(nextVal);
    if (onSelectDate) onSelectDate(nextVal);
  };

  const handleClearDayFilter = () => {
    setSelectedCalendarDate(null);
    if (onSelectDate) onSelectDate(null);
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-4 sm:px-0">
      {/* Lightbox / Full-size Photo Preview Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-lg w-full bg-slate-900 rounded-3xl overflow-hidden p-2">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhoto}
              alt="Corneal condition"
              className="w-full max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Episode & Care History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {allEvents.length} total logged records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddEpisode}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1 min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Episode</span>
          </button>
          <button
            onClick={onAddTreatment}
            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1 min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Treatment</span>
          </button>
        </div>
      </div>

      {/* Compact Calendar (Top Section) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        {/* Calendar Month Navigation */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                handleSelectCalendarDay(today.toISOString().split('T')[0]);
              }}
              className="px-2 py-1 text-[11px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Compact Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: calendarDays.firstDayIndex }).map((_, i) => (
            <div key={`blank_${i}`} className="h-10 rounded-lg bg-transparent" />
          ))}

          {calendarDays.days.map((day) => {
            const isSelected = selectedCalendarDate === day.dateStr;
            const hasEpisodes = day.episodes.length > 0;
            const hasTreatments = day.treatments.length > 0;
            const hasSkipped = day.treatments.some((t) => t.skipped);
            const hasPhotos = day.episodes.some((e) => !!e.photoUrl);
            const maxSeverity = hasEpisodes
              ? Math.max(...day.episodes.map((e) => e.severity))
              : 0;

            return (
              <button
                key={day.dateStr}
                onClick={() => handleSelectCalendarDay(day.dateStr)}
                className={`h-11 p-1 rounded-xl flex flex-col justify-between items-center border transition relative ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 ring-2 ring-teal-500 font-bold'
                    : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-[11px] text-slate-700 dark:text-slate-300">
                  {day.dayNum}
                </span>

                {/* Day status indicators */}
                <div className="flex items-center gap-0.5">
                  {hasEpisodes && (
                    <span
                      className={`w-2.5 h-2.5 rounded-full text-[8px] font-black text-white flex items-center justify-center ${
                        maxSeverity >= 4 ? 'bg-rose-600' : 'bg-orange-500'
                      }`}
                      title={`${day.episodes.length} episodes`}
                    />
                  )}

                  {hasPhotos && (
                    <Camera className="w-2.5 h-2.5 text-rose-500 flex-shrink-0" />
                  )}

                  {hasTreatments && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasSkipped ? 'bg-amber-500' : 'bg-teal-500'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected date filter banner */}
        {selectedCalendarDate && (
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between text-xs text-teal-900 dark:text-teal-200 animate-in fade-in">
            <span>
              Filtering feed to <strong>{selectedCalendarDate}</strong>
            </span>
            <button
              onClick={handleClearDayFilter}
              className="font-bold underline text-teal-700 dark:text-teal-300"
            >
              Show all dates
            </button>
          </div>
        )}
      </div>

      {/* Search & Single "Filter" Button Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symptoms, notes, drops, triggers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 min-h-[40px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Single Filter Button (Opens Sheet) */}
        <button
          type="button"
          onClick={() => setIsFilterSheetOpen(true)}
          className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] flex-shrink-0 ${
            activeFiltersCount > 0
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
          {activeFiltersCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-white text-teal-800 text-[10px] font-black flex items-center justify-center ml-0.5">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Options Bottom Sheet / Modal */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-600" />
                <span>Filter History Feed</span>
              </h3>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Date Range Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Timeframe
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(
                  [
                    { id: 'today', label: 'Today' },
                    { id: '7d', label: '7 Days' },
                    { id: '30d', label: '30 Days' },
                    { id: '90d', label: '90 Days' },
                    { id: 'all', label: 'All Time' },
                    { id: 'custom', label: 'Custom' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDateRange(opt.id)}
                    className={`py-2 px-2 rounded-xl font-semibold border transition text-center ${
                      dateRange === opt.id
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">From</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">To</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Event Category Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Event Category
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(
                  [
                    { id: 'all', label: 'All Events' },
                    { id: 'episodes', label: '⚡ Episodes Only' },
                    { id: 'treatments', label: '💧 Treatments' },
                    { id: 'skipped', label: '⚠️ Skipped Only' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFilterType(cat.id)}
                    className={`py-2 px-2.5 rounded-xl font-semibold border transition text-left ${
                      filterType === cat.id
                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent shadow'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDateRange('all');
                  setFilterType('all');
                  setSelectedCalendarDate(null);
                  if (onSelectDate) onSelectDate(null);
                  setSearchQuery('');
                  setIsFilterSheetOpen(false);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[42px]"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 min-h-[42px]"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chronological Feed of Events (Below Calendar) */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center">
          <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            No entries found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {selectedCalendarDate
              ? `No activity logged for ${selectedCalendarDate}. Tap another day or clear the date filter.`
              : 'Try adjusting your search keywords or broadening your filters.'}
          </p>
          {selectedCalendarDate && (
            <button
              onClick={handleClearDayFilter}
              className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
            >
              Clear day filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {groupedEvents.map(([dateKey, dayEvents]) => {
            const formattedDate = new Date(`${dateKey}T12:00:00`).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={dateKey} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {formattedDate}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    ({dayEvents.length} {dayEvents.length === 1 ? 'entry' : 'entries'})
                  </span>
                </div>

                <div className="space-y-2">
                  {dayEvents.map((item) => {
                    const time = new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    if (item.kind === 'episode') {
                      const ep = item.data;
                      const sev = getSeverityLabel(ep.severity);

                      return (
                        <div
                          key={ep.id}
                          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-500/20 shadow-sm hover:border-rose-500/40 transition space-y-2.5"
                        >
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <Zap className="w-4 h-4" />
                              </span>
                              <div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${sev.color}`}>
                                  {sev.label}
                                </span>
                                <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {getEyeShort(ep.eye)}
                                </span>
                              </div>

                              {/* Weather badge */}
                              {ep.weather && (
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 font-semibold">
                                  <CloudSun className="w-3 h-3 text-blue-500" />
                                  <span>{ep.weather.humidity}% Humidity</span>
                                  {ep.weather.humidity < 35 && (
                                    <span className="text-rose-500 font-bold">(!)</span>
                                  )}
                                  <span>• {ep.weather.tempC}°C</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 font-medium mr-1">{time}</span>
                              <button
                                onClick={() => onEditEpisode(ep)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Edit Episode"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this episode log?')) onDeleteEpisode(ep.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Delete Episode"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Photo Thumbnail */}
                          {ep.photoUrl && (
                            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                              <img
                                src={ep.photoUrl}
                                alt="Corneal photograph"
                                onClick={() => setPreviewPhoto(ep.photoUrl || null)}
                                className="w-14 h-14 object-cover rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer hover:opacity-90 transition active:scale-95"
                              />
                              <div className="text-xs">
                                <span className="font-bold text-slate-800 dark:text-white block">
                                  Corneal Photo
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhoto(ep.photoUrl || null)}
                                  className="text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold"
                                >
                                  Tap to expand full size
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Symptoms tags */}
                          {ep.symptoms && ep.symptoms.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {ep.symptoms.map((s) => (
                                <span
                                  key={s}
                                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  {getSymptomLabel(s)}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Trigger context */}
                          {ep.trigger && (
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              <strong className="text-slate-800 dark:text-white">Trigger:</strong>{' '}
                              {ep.trigger}
                            </p>
                          )}

                          {/* Action taken */}
                          {ep.actionTaken && (
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              <strong className="text-slate-800 dark:text-white">Action:</strong>{' '}
                              {ep.actionTaken}
                            </p>
                          )}

                          {/* Notes */}
                          {ep.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                              "{ep.notes}"
                            </p>
                          )}
                        </div>
                      );
                    } else {
                      const tr = item.data;

                      return (
                        <div
                          key={tr.id}
                          className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border shadow-sm transition space-y-2 ${
                            tr.skipped
                              ? 'border-amber-500/20 bg-amber-500/[0.02]'
                              : 'border-slate-200/80 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`p-1.5 rounded-lg ${
                                  tr.skipped
                                    ? 'bg-amber-500/10 text-amber-600'
                                    : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                                }`}
                              >
                                {tr.type === 'ointment' ? (
                                  <Moon className="w-4 h-4" />
                                ) : (
                                  <Droplets className="w-4 h-4" />
                                )}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {tr.productName}
                                  </span>
                                  {tr.skipped ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white">
                                      Skipped
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                      Applied
                                    </span>
                                  )}

                                  {/* Screen time tag if present */}
                                  {tr.screenTimeHours !== undefined && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                      <Monitor className="w-3 h-3 text-indigo-500" />
                                      <span>{tr.screenTimeHours}h Screen</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {getAnchorLabel(tr.anchor)} • {getEyeShort(tr.eye)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 font-medium mr-1">{time}</span>
                              <button
                                onClick={() => onEditTreatment(tr)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Edit Treatment"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this treatment log?')) onDeleteTreatment(tr.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Delete Treatment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {tr.skipped && (
                            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded-xl">
                              <strong>Skip reason:</strong> {getSkipReasonLabel(tr.skipReason)}
                              {tr.skipReasonCustom && ` — "${tr.skipReasonCustom}"`}
                            </p>
                          )}

                          {tr.notes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                              "{tr.notes}"
                            </p>
                          )}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
