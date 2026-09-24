import React, { useState, useMemo } from 'react';
import {
  FileText,
  Copy,
  Check,
  X,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { EpisodeLog, TreatmentLog, ExpenseItem, AppSettings, ReportRange } from '../types/ebmd';
import {
  getSeverityLabel,
  getSymptomLabel,
  getSkipReasonLabel,
} from '../utils/storage';
import { downloadDoctorReportPdf } from '../utils/pdfGenerator';

interface DoctorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  episodes: EpisodeLog[];
  treatments: TreatmentLog[];
  expenses: ExpenseItem[];
  settings: AppSettings;
}

export const DoctorReportModal: React.FC<DoctorReportModalProps> = ({
  isOpen,
  onClose,
  episodes,
  treatments,
  expenses,
  settings,
}) => {
  const [range, setRange] = useState<ReportRange>('30d');
  const [copied, setCopied] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string | null>(null);

  // Filter based on range
  const filteredData = useMemo(() => {
    const now = Date.now();
    let minTime = 0;
    if (range === '30d') minTime = now - 30 * 24 * 60 * 60 * 1000;
    else if (range === '60d') minTime = now - 60 * 24 * 60 * 60 * 1000;
    else if (range === '90d') minTime = now - 90 * 24 * 60 * 60 * 1000;
    else if (range === '180d') minTime = now - 180 * 24 * 60 * 60 * 1000;

    const ep = episodes
      .filter((e) => new Date(e.timestamp).getTime() >= minTime)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const tr = treatments
      .filter((t) => new Date(t.timestamp).getTime() >= minTime)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const exp = expenses
      .filter((e) => new Date(e.date).getTime() >= minTime)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { filteredEpisodes: ep, filteredTreatments: tr, filteredExpenses: exp };
  }, [episodes, treatments, expenses, range]);

  const { filteredEpisodes, filteredTreatments, filteredExpenses } = filteredData;

  // Key summary metrics
  const totalEpisodes = filteredEpisodes.length;
  const severeEpisodes = filteredEpisodes.filter((e) => e.severity >= 4).length;
  const wakingEpisodes = filteredEpisodes.filter(
    (e) =>
      e.symptoms.includes('sharp_waking_tear') ||
      e.trigger?.toLowerCase().includes('waking') ||
      e.trigger?.toLowerCase().includes('morning')
  ).length;

  const totalTreatments = filteredTreatments.length;
  const completedTreatments = filteredTreatments.filter((t) => !t.skipped).length;
  const skippedTreatments = totalTreatments - completedTreatments;
  const adherenceRate = totalTreatments > 0 ? Math.round((completedTreatments / totalTreatments) * 100) : 100;

  const nightTreatments = filteredTreatments.filter((t) => t.anchor === 'before_bed' || t.type === 'ointment');
  const nightCompleted = nightTreatments.filter((t) => !t.skipped).length;
  const nightAdherence = nightTreatments.length > 0 ? Math.round((nightCompleted / nightTreatments.length) * 100) : 100;

  const totalSpend = filteredExpenses.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  // Screen time stats
  const screenTimeLogs = filteredTreatments.filter((t) => t.screenTimeHours !== undefined);
  const avgScreenTime = screenTimeLogs.length > 0
    ? (screenTimeLogs.reduce((acc, t) => acc + (t.screenTimeHours || 0), 0) / screenTimeLogs.length).toFixed(1)
    : null;

  // Humidity stats
  const weatherLogs = filteredEpisodes.filter((e) => e.weather?.humidity !== undefined);
  const lowHumidityEpisodes = weatherLogs.filter((e) => (e.weather?.humidity || 50) < 35).length;

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    setPdfStatusMessage(null);
    try {
      downloadDoctorReportPdf({
        episodes: filteredEpisodes,
        treatments: filteredTreatments,
        expenses: filteredExpenses,
        settings,
        range,
        doctorNotes,
      });
      setPdfStatusMessage('PDF report generated and saved to your device!');
      setTimeout(() => setPdfStatusMessage(null), 5000);
    } catch (err) {
      console.error('PDF export error:', err);
      setPdfStatusMessage('Failed to download PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopySummary = () => {
    let text = `CORNEAL HEALTH REPORT: EPITHELIAL BASEMENT MEMBRANE DYSTROPHY (EBMD)\n`;
    text += `Date Generated: ${new Date().toLocaleDateString()}\n`;
    if (settings.patientName) text += `Patient: ${settings.patientName}\n`;
    if (settings.doctorName) text += `Clinician: ${settings.doctorName}\n`;
    text += `Period: ${range === 'all' ? 'All Time' : `Past ${range.replace('d', ' days')}`}\n\n`;

    text += `--- CLINICAL SUMMARY ---\n`;
    text += `Total Episodes Logged: ${totalEpisodes}\n`;
    text += `Severe Episodes (Level 4-5): ${severeEpisodes}\n`;
    text += `Morning Waking Tears / Erosions: ${wakingEpisodes} (${totalEpisodes > 0 ? Math.round((wakingEpisodes / totalEpisodes) * 100) : 0}%)\n`;
    text += `Overall Treatment Adherence: ${adherenceRate}%\n`;
    text += `Bedtime Ointment Adherence: ${nightAdherence}%\n`;
    if (avgScreenTime) text += `Avg Daily Screen Time: ${avgScreenTime} hours\n`;
    if (weatherLogs.length > 0) text += `Episodes in Low Humidity (<35%): ${lowHumidityEpisodes} of ${weatherLogs.length}\n`;
    text += `Total Out-of-Pocket Lubrication Cost: $${totalSpend.toFixed(2)}\n\n`;

    text += `--- RECENT EPISODES ---\n`;
    filteredEpisodes.slice(0, 10).forEach((ep) => {
      const dt = new Date(ep.timestamp).toLocaleString();
      const sev = getSeverityLabel(ep.severity);
      text += `• ${dt} | Eye: ${ep.eye} | ${sev.label}\n`;
      text += `  Symptoms: ${ep.symptoms.map(getSymptomLabel).join(', ')}\n`;
      if (ep.weather) text += `  Weather: ${ep.weather.humidity}% Humidity, ${ep.weather.tempC}°C\n`;
      if (ep.trigger) text += `  Trigger: ${ep.trigger}\n`;
      if (ep.actionTaken) text += `  Action: ${ep.actionTaken}\n`;
      if (ep.notes) text += `  Notes: ${ep.notes}\n`;
    });

    if (doctorNotes.trim()) {
      text += `\n--- PATIENT QUESTIONS / NOTES FOR APPOINTMENT ---\n${doctorNotes}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const configuredProductNames = settings.configuredProducts
    ? Object.values(settings.configuredProducts)
        .flatMap((list) => list)
        .filter(Boolean)
        .join(', ')
    : 'Muro 128 5% Ointment (Bedtime), Preservative-Free Artificial Tears (Midday/After lunch), Daytime Hypertonic Saline Drops (Upon waking).';

  return (
    <div className="report-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="report-modal-card w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar (Hidden when printing via CSS) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                Ophthalmology Clinical Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formatted record for corneal specialist appointments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Primary Download PDF Action */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm min-h-[38px] disabled:opacity-50"
              title="Generate and download a clinical PDF file"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingPdf ? 'Generating...' : 'Save PDF'}</span>
            </button>

            {/* Copy portal text */}
            <button
              onClick={handleCopySummary}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition flex items-center gap-1.5 min-h-[38px]"
              title="Copy clinical text to clipboard for patient portal message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            {/* Close modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              aria-label="Close report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert for PDF Status */}
        {pdfStatusMessage && (
          <div className="print:hidden px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="font-medium">{pdfStatusMessage}</span>
            </div>
            <button
              onClick={() => setPdfStatusMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Range Selector (Hidden when printing) */}
        <div className="print:hidden px-5 sm:px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Reporting Timeframe:</span>
          <div className="flex items-center gap-1">
            {(
              [
                { id: '30d', label: '30 Days' },
                { id: '60d', label: '60 Days' },
                { id: '90d', label: '90 Days' },
                { id: '180d', label: '6 Months' },
                { id: 'all', label: 'All History' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setRange(item.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                  range === item.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Printable Clinical Report Content */}
        <div
          id="doctor-report-printable"
          className="overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-200 print:text-black print:bg-white print:p-0 print:m-0"
        >
          {/* Clinic / Document Header */}
          <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white print:text-black">
                  CORNEAL EPISODE & ADHERENCE REPORT
                </h1>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 print:text-teal-800 mt-0.5">
                  Epithelial Basement Membrane Dystrophy (EBMD) & Recurrent Corneal Erosion (RCE)
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 print:text-slate-600">
                <div>Date: {new Date().toLocaleDateString()}</div>
                <div>App: EBMD Tracker</div>
              </div>
            </div>

            {/* Patient & Provider details row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Patient</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {settings.patientName || 'Patient (Self-Reported)'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Clinician</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {settings.doctorName || 'Cornea Specialist / MD'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Clinic</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {settings.clinicName || 'Eye Care Practice'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Reporting Range</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                  {range === 'all' ? 'Complete History' : `Past ${range.replace('d', ' Days')}`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Clinical Summary Box */}
          <div className="print-avoid-break p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 print:bg-slate-100 border border-slate-200 dark:border-slate-700 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black">
              1. Executive Clinical Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="print-avoid-break p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-slate-200 dark:border-slate-700">
                <div className="text-xl font-black text-rose-600 print:text-rose-700">{totalEpisodes}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Total Episodes</div>
              </div>
              <div className="print-avoid-break p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-slate-200 dark:border-slate-700">
                <div className="text-xl font-black text-orange-600 print:text-orange-700">{severeEpisodes}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Level 4-5 Severe Tears</div>
              </div>
              <div className="print-avoid-break p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-slate-200 dark:border-slate-700">
                <div className="text-xl font-black text-teal-600 print:text-teal-700">{adherenceRate}%</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Overall Adherence</div>
              </div>
              <div className="print-avoid-break p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-slate-200 dark:border-slate-700">
                <div className="text-xl font-black text-indigo-600 print:text-indigo-700">{nightAdherence}%</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Bedtime Ointment</div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 print:text-slate-700 pt-1 leading-relaxed">
              • <strong>Waking Opening Tears:</strong> {wakingEpisodes} of {totalEpisodes} episodes ({totalEpisodes > 0 ? Math.round((wakingEpisodes / totalEpisodes) * 100) : 0}%) occurred upon waking or eyelid opening, consistent with classical EBMD nocturnal corneal desiccation and epithelial adhesion.
              <br />
              • <strong>Treatment Adherence:</strong> {completedTreatments} applied, {skippedTreatments} skipped.
              {avgScreenTime && (
                <>
                  <br />
                  • <strong>Screen Time Exposure:</strong> Average daily screen time logged was {avgScreenTime} hours (prolonged visual display use suppresses normal blink reflex).
                </>
              )}
              {weatherLogs.length > 0 && (
                <>
                  <br />
                  • <strong>Environmental Humidity:</strong> {lowHumidityEpisodes} of {weatherLogs.length} episodes occurred during dry ambient air (&lt;35% relative humidity).
                </>
              )}
              <br />
              • <strong>Out-of-Pocket Spend:</strong> Total of ${totalSpend.toFixed(2)} across {filteredExpenses.length} documented lubrication supplies during this timeframe.
            </p>
          </div>

          {/* Section 2: Chronological Episode Log Table */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black">
              2. Episodes & Recurrent Erosions Chronicle ({filteredEpisodes.length})
            </h2>

            {filteredEpisodes.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No episodes recorded during this timeframe.
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 print:text-black">
                      <th className="p-2.5">Date & Time</th>
                      <th className="p-2.5">Eye</th>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Symptoms & Details</th>
                      <th className="p-2.5">Environment / Photo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                    {filteredEpisodes.map((ep) => {
                      const sev = getSeverityLabel(ep.severity);
                      const dt = new Date(ep.timestamp);
                      const dateStr = dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
                      const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr key={ep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 print-avoid-break">
                          <td className="p-2.5 font-medium whitespace-nowrap">
                            <div>{dateStr}</div>
                            <div className="text-[10px] text-slate-400">{timeStr}</div>
                          </td>
                          <td className="p-2.5 font-bold whitespace-nowrap">{ep.eye}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="font-bold text-rose-600 print:text-black">
                              Lvl {ep.severity}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-medium">
                              {ep.symptoms.map(getSymptomLabel).join(', ')}
                            </div>
                            {ep.trigger && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                <strong>Trigger:</strong> {ep.trigger}
                              </div>
                            )}
                            {ep.actionTaken && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                <strong>Action:</strong> {ep.actionTaken}
                              </div>
                            )}
                            {ep.notes && (
                              <div className="text-[10px] text-slate-500 italic mt-0.5">
                                "{ep.notes}"
                              </div>
                            )}
                          </td>
                          <td className="p-2.5">
                            <div className="space-y-1">
                              {ep.weather && (
                                <div className="text-[10px] text-blue-700 dark:text-blue-300 print:text-black font-medium">
                                  {ep.weather.humidity}% Hum • {ep.weather.tempC}°C
                                </div>
                              )}
                              {ep.photoUrl && (
                                <div className="mt-1">
                                  <img
                                    src={ep.photoUrl}
                                    alt="Corneal condition"
                                    className="w-14 h-14 object-cover rounded-md border border-slate-300 print:border-black"
                                  />
                                  <span className="text-[9px] text-slate-400 block mt-0.5">Photo attached</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Daily Routine & Missed Doses Log */}
          <div className="print-avoid-break space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black">
              3. Treatment Regimen & Skipped Doses Audit
            </h2>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p>
                <strong>Current Configured Products:</strong> {configuredProductNames}
              </p>
              {skippedTreatments > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 print:text-black text-xs">
                  <strong>Skipped Dose Reasons Recorded:</strong>{' '}
                  {Array.from(
                    new Set(
                      filteredTreatments
                        .filter((t) => t.skipped && t.skipReason)
                        .map((t) => getSkipReasonLabel(t.skipReason))
                    )
                  ).join(', ') || 'Various reasons'}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Patient Questions / Notes for Clinician */}
          <div className="print-avoid-break space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black">
              4. Questions / Topics to Discuss with Doctor
            </label>
            <div className="print:hidden">
              <textarea
                rows={3}
                placeholder="e.g. Ask about autologous serum tears, PTK (phototherapeutic keratectomy), amniotic membrane, or nightly moisture chamber goggles..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
            {doctorNotes.trim() && (
              <div className="hidden print:block p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-black whitespace-pre-line">
                {doctorNotes.trim()}
              </div>
            )}
          </div>

          {/* Clinician Signature line when printed */}
          <div className="print-avoid-break hidden print:block pt-8 border-t border-slate-300 mt-6 text-xs">
            <div className="flex justify-between items-end">
              <div>
                <div className="w-56 border-b border-black mb-1" />
                <div>Clinician Signature / Date</div>
              </div>
              <div className="text-right text-slate-500">
                EBMD Tracker Report • Generated by Patient
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
