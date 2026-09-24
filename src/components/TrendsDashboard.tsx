import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Eye,
  Info,
  Moon,
  Zap,
  CloudSun,
  Droplets,
  Monitor,
  Wind,
  Thermometer,
  Sparkles,
  X,
} from 'lucide-react';
import { EpisodeLog, TreatmentLog } from '../types/ebmd';
import { getSeverityLabel, getSymptomLabel, getEyeShort } from '../utils/storage';

interface TrendsDashboardProps {
  episodes: EpisodeLog[];
  treatments: TreatmentLog[];
}

type Timeframe = '30d' | '90d' | 'all';

export const TrendsDashboard: React.FC<TrendsDashboardProps> = ({ episodes, treatments }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [isInsightsBannerDismissed, setIsInsightsBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ebmd_trends_insights_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissInsightsBanner = () => {
    setIsInsightsBannerDismissed(true);
    try {
      localStorage.setItem('ebmd_trends_insights_dismissed', 'true');
    } catch {}
  };

  // Filter by timeframe
  const filteredData = useMemo(() => {
    const now = Date.now();
    let minTime = 0;
    if (timeframe === '30d') minTime = now - 30 * 24 * 60 * 60 * 1000;
    else if (timeframe === '90d') minTime = now - 90 * 24 * 60 * 60 * 1000;

    const ep = episodes.filter((item) => {
      if (timeframe === 'all') return true;
      const time = new Date(item.timestamp).getTime();
      return !isNaN(time) && time >= minTime;
    });
    const tr = treatments.filter((item) => {
      if (timeframe === 'all') return true;
      const time = new Date(item.timestamp).getTime();
      return !isNaN(time) && time >= minTime;
    });
    return { episodes: ep, treatments: tr };
  }, [episodes, treatments, timeframe]);

  const { episodes: activeEpisodes, treatments: activeTreatments } = filteredData;

  // 1. Overall Adherence Metrics
  const metrics = useMemo(() => {
    const totalTreatments = activeTreatments.length;
    const completedTreatments = activeTreatments.filter((t) => !t.skipped).length;
    const skippedTreatments = totalTreatments - completedTreatments;
    const adherenceRate = totalTreatments > 0 ? Math.round((completedTreatments / totalTreatments) * 100) : 100;

    // Bedtime ointment adherence (the most critical metric in EBMD)
    const nightTreatments = activeTreatments.filter((t) => t.anchor === 'before_bed' || t.type === 'ointment');
    const nightCompleted = nightTreatments.filter((t) => !t.skipped).length;
    const nightAdherence = nightTreatments.length > 0 ? Math.round((nightCompleted / nightTreatments.length) * 100) : 100;

    const totalEpisodes = activeEpisodes.length;
    const avgSeverity = totalEpisodes > 0
      ? (activeEpisodes.reduce((acc, cur) => acc + cur.severity, 0) / totalEpisodes).toFixed(1)
      : '0.0';

    // Morning waking episodes (hallmark of EBMD)
    const wakingEpisodes = activeEpisodes.filter(
      (e) =>
        e.symptoms.includes('sharp_waking_tear') ||
        e.trigger?.toLowerCase().includes('waking') ||
        e.trigger?.toLowerCase().includes('morning')
    ).length;

    const wakingPercentage = totalEpisodes > 0 ? Math.round((wakingEpisodes / totalEpisodes) * 100) : 0;

    return {
      totalTreatments,
      completedTreatments,
      skippedTreatments,
      adherenceRate,
      nightAdherence,
      totalEpisodes,
      avgSeverity,
      wakingEpisodes,
      wakingPercentage,
    };
  }, [activeTreatments, activeEpisodes]);

  // 2. Weekly / Monthly Episodes & Skipped correlation bars
  const weeklyTrend = useMemo(() => {
    const now = new Date();
    const weeks: {
      label: string;
      episodesCount: number;
      skippedCount: number;
      usedCount: number;
      adherence: number;
    }[] = [];

    if (timeframe === '30d') {
      const weeksCount = 4;
      for (let i = weeksCount - 1; i >= 0; i--) {
        const start = i === weeksCount - 1
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const end = i === 0
          ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

        const ep = activeEpisodes.filter((e) => {
          const t = new Date(e.timestamp).getTime();
          return t >= start.getTime() && t < end.getTime();
        });

        const tr = activeTreatments.filter((t) => {
          const time = new Date(t.timestamp).getTime();
          return time >= start.getTime() && time < end.getTime();
        });

        const used = tr.filter((t) => !t.skipped).length;
        const skipped = tr.filter((t) => t.skipped).length;
        const adh = tr.length > 0 ? Math.round((used / tr.length) * 100) : 100;

        weeks.push({
          label: i === 0 ? 'Recent' : `W${weeksCount - i}`,
          episodesCount: ep.length,
          skippedCount: skipped,
          usedCount: used,
          adherence: adh,
        });
      }
    } else if (timeframe === '90d') {
      const periodsCount = 6;
      for (let i = periodsCount - 1; i >= 0; i--) {
        const start = i === periodsCount - 1
          ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - (i + 1) * 15 * 24 * 60 * 60 * 1000);
        const end = i === 0
          ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - i * 15 * 24 * 60 * 60 * 1000);

        const ep = activeEpisodes.filter((e) => {
          const t = new Date(e.timestamp).getTime();
          return t >= start.getTime() && t < end.getTime();
        });

        const tr = activeTreatments.filter((t) => {
          const time = new Date(t.timestamp).getTime();
          return time >= start.getTime() && time < end.getTime();
        });

        const used = tr.filter((t) => !t.skipped).length;
        const skipped = tr.filter((t) => t.skipped).length;
        const adh = tr.length > 0 ? Math.round((used / tr.length) * 100) : 100;

        weeks.push({
          label: i === 0 ? 'Recent' : `P${periodsCount - i}`,
          episodesCount: ep.length,
          skippedCount: skipped,
          usedCount: used,
          adherence: adh,
        });
      }
    } else {
      // 'all' timeframe: Dynamically cover all saved history
      let earliestTime = now.getTime() - 90 * 24 * 60 * 60 * 1000;
      if (activeEpisodes.length > 0) {
        const oldestEp = Math.min(...activeEpisodes.map((e) => new Date(e.timestamp).getTime()));
        if (!isNaN(oldestEp) && oldestEp < earliestTime) earliestTime = oldestEp;
      }
      if (activeTreatments.length > 0) {
        const oldestTr = Math.min(...activeTreatments.map((t) => new Date(t.timestamp).getTime()));
        if (!isNaN(oldestTr) && oldestTr < earliestTime) earliestTime = oldestTr;
      }

      const totalSpanDays = Math.max(Math.ceil((now.getTime() - earliestTime) / (24 * 60 * 60 * 1000)), 30);
      const bucketCount = totalSpanDays > 90 ? Math.min(Math.ceil(totalSpanDays / 30), 6) : 4;
      const bucketDurationMs = (now.getTime() - earliestTime) / bucketCount;

      for (let i = 0; i < bucketCount; i++) {
        const start = i === 0 ? 0 : earliestTime + i * bucketDurationMs;
        const end = i === bucketCount - 1 ? Infinity : earliestTime + (i + 1) * bucketDurationMs;

        const ep = activeEpisodes.filter((e) => {
          const t = new Date(e.timestamp).getTime();
          return t >= start && t < end;
        });

        const tr = activeTreatments.filter((t) => {
          const time = new Date(t.timestamp).getTime();
          return time >= start && time < end;
        });

        const used = tr.filter((t) => !t.skipped).length;
        const skipped = tr.filter((t) => t.skipped).length;
        const adh = tr.length > 0 ? Math.round((used / tr.length) * 100) : 100;

        const bucketDate = new Date(earliestTime + (i + 0.5) * bucketDurationMs);
        const monthLabel = bucketDate.toLocaleDateString(undefined, { month: 'short' });

        weeks.push({
          label: monthLabel || `M${i + 1}`,
          episodesCount: ep.length,
          skippedCount: skipped,
          usedCount: used,
          adherence: adh,
        });
      }
    }

    return weeks;
  }, [activeEpisodes, activeTreatments, timeframe]);

  // 3. Humidity & Weather Correlation
  const humidityStats = useMemo(() => {
    const epsWithWeather = activeEpisodes.filter((e) => e.weather && e.weather.humidity !== undefined);
    if (epsWithWeather.length === 0) {
      return {
        hasData: false,
        totalWithWeather: 0,
        avgHumidity: 0,
        brackets: [
          { label: 'Low (<35%)', range: '<35%', count: 0, avgSev: 0, color: 'bg-amber-500' },
          { label: 'Optimal (35-60%)', range: '35-60%', count: 0, avgSev: 0, color: 'bg-teal-500' },
          { label: 'High (>60%)', range: '>60%', count: 0, avgSev: 0, color: 'bg-blue-500' },
        ],
      };
    }

    const totalHum = epsWithWeather.reduce((acc, e) => acc + (e.weather?.humidity || 0), 0);
    const avgHumidity = Math.round(totalHum / epsWithWeather.length);

    const low = epsWithWeather.filter((e) => (e.weather?.humidity || 0) < 35);
    const med = epsWithWeather.filter(
      (e) => (e.weather?.humidity || 0) >= 35 && (e.weather?.humidity || 0) <= 60
    );
    const high = epsWithWeather.filter((e) => (e.weather?.humidity || 0) > 60);

    const calcAvgSev = (arr: EpisodeLog[]) =>
      arr.length > 0
        ? (arr.reduce((acc, cur) => acc + cur.severity, 0) / arr.length).toFixed(1)
        : '0.0';

    return {
      hasData: true,
      totalWithWeather: epsWithWeather.length,
      avgHumidity,
      brackets: [
        {
          label: 'Low (<35% Dry Air)',
          range: '<35%',
          count: low.length,
          avgSev: Number(calcAvgSev(low)),
          color: 'bg-rose-500',
        },
        {
          label: 'Optimal (35-60%)',
          range: '35-60%',
          count: med.length,
          avgSev: Number(calcAvgSev(med)),
          color: 'bg-teal-500',
        },
        {
          label: 'High (>60% Humid)',
          range: '>60%',
          count: high.length,
          avgSev: Number(calcAvgSev(high)),
          color: 'bg-blue-500',
        },
      ],
    };
  }, [activeEpisodes]);

  // 4. Screen-Time Correlation
  const screenTimeStats = useMemo(() => {
    // Map screen time entries by date YYYY-MM-DD
    const dateScreenTimeMap: Record<string, number> = {};
    activeTreatments.forEach((t) => {
      if (t.screenTimeHours !== undefined) {
        const d = t.timestamp.slice(0, 10);
        // keep the latest or max recorded for that day
        dateScreenTimeMap[d] = Math.max(dateScreenTimeMap[d] || 0, t.screenTimeHours);
      }
    });

    const recordedDaysCount = Object.keys(dateScreenTimeMap).length;
    if (recordedDaysCount === 0) {
      return {
        hasData: false,
        tiers: [
          { tier: 'Low (<4 hrs)', count: 0, avgSeverity: 0, daysCount: 0, color: 'bg-emerald-500' },
          { tier: 'Moderate (4-7 hrs)', count: 0, avgSeverity: 0, daysCount: 0, color: 'bg-amber-500' },
          { tier: 'Heavy (8+ hrs)', count: 0, avgSeverity: 0, daysCount: 0, color: 'bg-rose-500' },
        ],
      };
    }

    // Categorize days and count episodes occurring on those days
    const tiers = [
      {
        tier: 'Low (<4 hrs)',
        min: 0,
        max: 3.99,
        episodes: [] as EpisodeLog[],
        daysCount: 0,
        color: 'bg-emerald-500',
      },
      {
        tier: 'Moderate (4-7 hrs)',
        min: 4,
        max: 7.99,
        episodes: [] as EpisodeLog[],
        daysCount: 0,
        color: 'bg-amber-500',
      },
      {
        tier: 'Heavy (8+ hrs)',
        min: 8,
        max: 24,
        episodes: [] as EpisodeLog[],
        daysCount: 0,
        color: 'bg-rose-500',
      },
    ];

    Object.entries(dateScreenTimeMap).forEach(([dateStr, hours]) => {
      const tierObj = tiers.find((t) => hours >= t.min && hours <= t.max);
      if (tierObj) {
        tierObj.daysCount += 1;
        // find episodes on that same date
        const epsOnDate = activeEpisodes.filter((e) => e.timestamp.slice(0, 10) === dateStr);
        tierObj.episodes.push(...epsOnDate);
      }
    });

    return {
      hasData: true,
      tiers: tiers.map((t) => {
        const epCount = t.episodes.length;
        const avgSev =
          epCount > 0
            ? Number((t.episodes.reduce((acc, cur) => acc + cur.severity, 0) / epCount).toFixed(1))
            : 0;
        return {
          tier: t.tier,
          count: epCount,
          avgSeverity: avgSev,
          daysCount: t.daysCount,
          color: t.color,
        };
      }),
    };
  }, [activeTreatments, activeEpisodes]);

  // 5. Eye Distribution (OD vs OS vs OU)
  const eyeDistribution = useMemo(() => {
    const counts = { OD: 0, OS: 0, OU: 0 };
    activeEpisodes.forEach((e) => {
      counts[e.eye] = (counts[e.eye] || 0) + 1;
    });
    return counts;
  }, [activeEpisodes]);

  // 6. Severity Distribution (1 to 5)
  const severityDistribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    activeEpisodes.forEach((e) => {
      counts[e.severity] = (counts[e.severity] || 0) + 1;
    });
    return counts;
  }, [activeEpisodes]);

  // 7. Symptom frequencies
  const topSymptoms = useMemo(() => {
    const map: Record<string, number> = {};
    activeEpisodes.forEach((e) => {
      e.symptoms.forEach((s) => {
        map[s] = (map[s] || 0) + 1;
      });
    });
    return Object.entries(map)
      .map(([sym, count]) => ({ sym, count, label: getSymptomLabel(sym) }))
      .sort((a, b) => b.count - a.count);
  }, [activeEpisodes]);

  // Max value for bar scaling
  const maxWeeklyEpisodes = Math.max(...weeklyTrend.map((w) => w.episodesCount), 4);
  const maxWeeklySkipped = Math.max(...weeklyTrend.map((w) => w.skippedCount), 4);

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 sm:px-0">
      {/* Header and Timeframe Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Corneal Trends & Insights</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {timeframe === '30d' && `Past 30 days • ${metrics.totalEpisodes} ${metrics.totalEpisodes === 1 ? 'episode' : 'episodes'}`}
            {timeframe === '90d' && `Past 90 days • ${metrics.totalEpisodes} ${metrics.totalEpisodes === 1 ? 'episode' : 'episodes'}`}
            {timeframe === 'all' && `All saved history • ${metrics.totalEpisodes} ${metrics.totalEpisodes === 1 ? 'episode' : 'episodes'}`}
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs self-start sm:self-auto">
          {(
            [
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'all', label: 'All Days' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                timeframe === t.id
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Episodes
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {metrics.totalEpisodes}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Avg severity {metrics.avgSeverity} / 5
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Adherence Rate
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
            {metrics.adherenceRate}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {metrics.completedTreatments} of {metrics.totalTreatments} doses
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Moon className="w-3 h-3 text-teal-500" />
            <span>Night Ointment</span>
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
            {metrics.nightAdherence}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Bedtime shield adherence
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Morning Wake %
          </div>
          <div className="text-2xl font-black text-orange-500 mt-1">
            {metrics.wakingPercentage}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {metrics.wakingEpisodes} morning tears
          </div>
        </div>
      </div>

      {/* Primary Chart: Adherence vs Episodes Correlation */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Adherence vs. Episode Frequency</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Notice how episodes often spike following skipped treatments (especially missed night ointment)
          </p>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="h-44 flex items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-2">
            {weeklyTrend.map((week, idx) => {
              const epHeight = (week.episodesCount / maxWeeklyEpisodes) * 100;
              const skipHeight = (week.skippedCount / maxWeeklySkipped) * 100;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-900 text-white text-[10px] rounded-lg px-2 py-1 shadow-lg whitespace-nowrap z-20">
                    <div>Episodes: {week.episodesCount}</div>
                    <div>Skipped: {week.skippedCount}</div>
                    <div>Adherence: {week.adherence}%</div>
                  </div>

                  {/* Dual Bars side-by-side */}
                  <div className="w-full flex items-end justify-center gap-1.5 h-36">
                    {/* Episodes Bar (Rose) */}
                    <div
                      style={{ height: `${Math.max(epHeight, 6)}%` }}
                      className={`w-1/2 max-w-[18px] rounded-t-lg transition-all ${
                        week.episodesCount > 0 ? 'bg-rose-500 dark:bg-rose-600' : 'bg-rose-500/10'
                      }`}
                    >
                      {week.episodesCount > 0 && (
                        <span className="block text-center text-[10px] font-bold text-white -mt-4">
                          {week.episodesCount}
                        </span>
                      )}
                    </div>

                    {/* Skipped Bar (Amber) */}
                    <div
                      style={{ height: `${Math.max(skipHeight, 6)}%` }}
                      className={`w-1/2 max-w-[18px] rounded-t-lg transition-all ${
                        week.skippedCount > 0 ? 'bg-amber-500 dark:bg-amber-600' : 'bg-amber-500/10'
                      }`}
                    >
                      {week.skippedCount > 0 && (
                        <span className="block text-center text-[10px] font-bold text-white -mt-4">
                          {week.skippedCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-slate-400 mt-2">
                    {week.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="mt-3 flex items-center justify-center gap-5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" />
              <span>Episodes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span>Skipped Doses</span>
            </div>
          </div>
        </div>

        {/* Clinical Note Callout */}
        <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 flex items-start gap-2.5 text-xs text-teal-900 dark:text-teal-200">
          <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Corneal Specialist Insight:</strong> In EBMD, epithelial basement membrane micro-cysts and faulty hemidesmosomes make the corneal surface vulnerable. Night ointment forms a physical barrier that prevents the palpebral conjunctiva (eyelid) from adhering to the epithelium during REM sleep and morning opening.
          </p>
        </div>
      </div>

      {/* Combined Dismissible "Enable more insights" Card (when weather or screen time data is missing) */}
      {(!humidityStats.hasData || !screenTimeStats.hasData) && !isInsightsBannerDismissed && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-sky-500/10 border border-teal-500/20 shadow-sm relative animate-in fade-in space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Enable more insights</span>
            </div>
            <button
              type="button"
              onClick={handleDismissInsightsBanner}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition"
              title="Dismiss banner"
              aria-label="Dismiss insights suggestion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Correlate your corneal episodes against dry-air triggers and digital eye strain to unlock environmental patterns.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {!humidityStats.hasData && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs font-medium">
                <CloudSun className="w-3.5 h-3.5 text-blue-500" />
                <span>Weather auto-detects when logging episodes</span>
              </span>
            )}
            {!screenTimeStats.hasData && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs font-medium">
                <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                <span>Log screen hours once daily on Home</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Weather & Humidity Correlation Section (rendered when data exists) */}
      {humidityStats.hasData && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-sky-500" />
                <span>Ambient Humidity & Corneal Episodes</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Correlation between relative humidity (% RH) at time of logging and corneal erosion risk
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              Avg: {humidityStats.avgHumidity}% RH
            </span>
          </div>

          <div className="space-y-4">
            {/* Visual breakdown cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {humidityStats.brackets.map((b) => {
                const total = humidityStats.totalWithWeather || 1;
                const pct = Math.round((b.count / total) * 100);

                return (
                  <div
                    key={b.range}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {b.label}
                      </span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {b.count}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full ${b.color} rounded-full transition-all`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{pct}% of episodes</span>
                      <span>Avg Sev: {b.avgSev > 0 ? b.avgSev : '-'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Insight text */}
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 flex items-start gap-2.5 text-xs text-sky-950 dark:text-sky-200">
              <Droplets className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Dry Air Impact:</strong> Ambient humidity under 35% dramatically accelerates tear evaporation, leaving the epithelial basement membrane brittle and vulnerable to nocturnal shearing upon morning eyelid elevation. Consider running a bedroom humidifier on low-humidity days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Screen-Time vs Episode Severity Correlation Section (rendered when data exists) */}
      {screenTimeStats.hasData && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-500" />
                <span>Screen Time vs. Episode Frequency & Severity</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Correlating daily digital screen exposure with corneal erosion flare-ups
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {screenTimeStats.tiers.map((t) => (
                <div
                  key={t.tier}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{t.tier}</span>
                    <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {t.daysCount} {t.daysCount === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <div className="pt-1 flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        {t.count}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1">episodes</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {t.avgSeverity > 0 ? `Lvl ${t.avgSeverity}` : '-'}
                      </span>
                      <span className="block text-[10px] text-slate-400">avg severity</span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(t.count * 25, 100)}%` }}
                      className={`h-full ${t.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Blink Rate Suppression:</strong> Visual display terminals (VDTs) reduce spontaneous blink rate by over 60% (from ~18 blinks/min down to 4–6 blinks/min). In EBMD eyes, incomplete blinks fail to replenish the lipid layer, inducing micro-erosions on already fragile epithelial ridges.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Eye Distribution & Severity Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Affected Eye Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Affected Eye Distribution</span>
          </h3>

          <div className="space-y-2.5 pt-1">
            {(
              [
                { eye: 'OS', label: 'Left Eye (OS)', count: eyeDistribution.OS, color: 'bg-indigo-500' },
                { eye: 'OD', label: 'Right Eye (OD)', count: eyeDistribution.OD, color: 'bg-teal-500' },
                { eye: 'OU', label: 'Both Eyes (OU)', count: eyeDistribution.OU, color: 'bg-emerald-500' },
              ] as const
            ).map((item) => {
              const total = metrics.totalEpisodes || 1;
              const pct = Math.round((item.count / total) * 100);

              return (
                <div key={item.eye}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-bold">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-rose-500" />
            <span>Episode Severity Breakdown</span>
          </h3>

          <div className="space-y-2 pt-1">
            {[5, 4, 3, 2, 1].map((lvl) => {
              const count = severityDistribution[lvl] || 0;
              const total = metrics.totalEpisodes || 1;
              const pct = Math.round((count / total) * 100);
              const info = getSeverityLabel(lvl);

              return (
                <div key={lvl}>
                  <div className="flex justify-between text-xs font-semibold mb-0.5">
                    <span className="text-slate-700 dark:text-slate-300">{info.label}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-bold">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        lvl === 5
                          ? 'bg-rose-600'
                          : lvl === 4
                          ? 'bg-orange-500'
                          : lvl === 3
                          ? 'bg-amber-500'
                          : lvl === 2
                          ? 'bg-teal-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Symptoms Experienced */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Most Frequent Symptoms
        </h3>

        {topSymptoms.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No symptoms recorded yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topSymptoms.map((s) => (
              <div
                key={s.sym}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between"
              >
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {s.label}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {s.count}x
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

