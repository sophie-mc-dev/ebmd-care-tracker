import jsPDF from 'jspdf';
import { EpisodeLog, TreatmentLog, ExpenseItem, AppSettings, ReportRange } from '../types/ebmd';
import {
  getSeverityLabel,
  getSymptomLabel,
  getSkipReasonLabel,
} from './storage';

export interface DoctorReportPdfData {
  episodes: EpisodeLog[];
  treatments: TreatmentLog[];
  expenses: ExpenseItem[];
  settings: AppSettings;
  range: ReportRange;
  doctorNotes?: string;
}

export function generateDoctorReportPdf(data: DoctorReportPdfData): jsPDF {
  const { episodes, treatments, expenses, settings, range, doctorNotes } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  let y = 16;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 16;
      // Mini running header on subsequent pages
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(13, 148, 136); // teal-600
      doc.text('EBMD CORNEAL CLINICAL REPORT (CONTINUED)', marginX, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const patientStr = settings.patientName ? `Patient: ${settings.patientName}` : 'Patient Report';
      doc.text(patientStr, pageWidth - marginX, y, { align: 'right' });

      y += 3;
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 8;
    }
  };

  // -------------------------------------------------------------
  // Header: Medical Clinic Top Banner
  // -------------------------------------------------------------
  // Brand / Eyecare badge
  doc.setFillColor(13, 148, 136); // teal-600
  doc.roundedRect(marginX, y, 10, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Rx', marginX + 2.8, y + 6.8);

  // Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('CORNEAL HEALTH CLINICAL REPORT', marginX + 14, y + 6.5);

  const nowFormatted = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${nowFormatted}`, pageWidth - marginX, y + 6.5, { align: 'right' });

  y += 13;

  // Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110); // teal-700
  doc.text(
    'Epithelial Basement Membrane Dystrophy (EBMD) & Recurrent Corneal Erosion (RCE)',
    marginX,
    y
  );

  y += 5;
  doc.setDrawColor(15, 23, 42); // slate-900 dark line
  doc.setLineWidth(0.8);
  doc.line(marginX, y, pageWidth - marginX, y);

  y += 6;

  // -------------------------------------------------------------
  // Patient & Clinical Metadata Grid
  // -------------------------------------------------------------
  const rangeLabel =
    range === 'all'
      ? 'Complete History'
      : range === '180d'
      ? 'Past 6 Months'
      : range === '90d'
      ? 'Past 90 Days'
      : range === '60d'
      ? 'Past 60 Days'
      : 'Past 30 Days';

  const metaBoxWidth = contentWidth / 4;
  const metaY = y;

  const metadata = [
    { label: 'PATIENT', val: settings.patientName || 'Patient (Self-Reported)' },
    { label: 'CLINICIAN', val: settings.doctorName || 'Cornea Specialist / MD' },
    { label: 'CLINIC', val: settings.clinicName || 'Eye Care Practice' },
    { label: 'TIMEFRAME', val: rangeLabel },
  ];

  metadata.forEach((m, idx) => {
    const colX = marginX + idx * metaBoxWidth;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(m.label, colX, metaY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59); // slate-800
    const truncatedVal = doc.splitTextToSize(m.val, metaBoxWidth - 3);
    doc.text(truncatedVal[0] || m.val, colX, metaY + 4.5);
  });

  y += 12;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 7;

  // -------------------------------------------------------------
  // Section 1: Executive Clinical Summary
  // -------------------------------------------------------------
  checkPageBreak(50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. EXECUTIVE CLINICAL SUMMARY', marginX, y);
  y += 4.5;

  // Compute key stats
  const totalEpisodes = episodes.length;
  const severeEpisodes = episodes.filter((e) => e.severity >= 4).length;
  const wakingEpisodes = episodes.filter(
    (e) =>
      e.symptoms.includes('sharp_waking_tear') ||
      e.trigger?.toLowerCase().includes('waking') ||
      e.trigger?.toLowerCase().includes('morning')
  ).length;

  const totalTreatments = treatments.length;
  const completedTreatments = treatments.filter((t) => !t.skipped).length;
  const adherenceRate = totalTreatments > 0 ? Math.round((completedTreatments / totalTreatments) * 100) : 100;

  const nightTreatments = treatments.filter((t) => t.anchor === 'before_bed' || t.type === 'ointment');
  const nightCompleted = nightTreatments.filter((t) => !t.skipped).length;
  const nightAdherence =
    nightTreatments.length > 0 ? Math.round((nightCompleted / nightTreatments.length) * 100) : 100;

  const totalSpend = expenses.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  const screenTimeLogs = treatments.filter((t) => t.screenTimeHours !== undefined);
  const avgScreenTime =
    screenTimeLogs.length > 0
      ? (screenTimeLogs.reduce((acc, t) => acc + (t.screenTimeHours || 0), 0) / screenTimeLogs.length).toFixed(1)
      : null;

  const weatherLogs = episodes.filter((e) => e.weather?.humidity !== undefined);
  const lowHumidityEpisodes = weatherLogs.filter((e) => (e.weather?.humidity || 50) < 35).length;

  // 4 stat cards in a row
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 16;
  const cardStats = [
    { title: 'TOTAL EPISODES', val: `${totalEpisodes}`, color: [225, 29, 72] as [number, number, number] }, // rose-600
    { title: 'LVL 4-5 SEVERE TEARS', val: `${severeEpisodes}`, color: [234, 88, 12] as [number, number, number] }, // orange-600
    { title: 'OVERALL ADHERENCE', val: `${adherenceRate}%`, color: [13, 148, 136] as [number, number, number] }, // teal-600
    { title: 'BEDTIME OINTMENT', val: `${nightAdherence}%`, color: [79, 70, 229] as [number, number, number] }, // indigo-600
  ];

  cardStats.forEach((card, idx) => {
    const cardX = marginX + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.val, cardX + cardWidth / 2, y + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.title, cardX + cardWidth / 2, y + 12.5, { align: 'center' });
  });

  y += cardHeight + 4;

  // Narrative bullet points
  const wakingPct = totalEpisodes > 0 ? Math.round((wakingEpisodes / totalEpisodes) * 100) : 0;
  const bulletLines = [
    `• Waking Opening Tears: ${wakingEpisodes} of ${totalEpisodes} episodes (${wakingPct}%) occurred upon waking or eyelid opening, consistent with classical EBMD nocturnal corneal desiccation and epithelial adhesion to the palpebral conjunctiva.`,
    `• Regimen Adherence: ${completedTreatments} applications completed, ${totalTreatments - completedTreatments} skipped out of ${totalTreatments} scheduled doses.`,
  ];

  if (avgScreenTime) {
    bulletLines.push(
      `• Screen Time Exposure: Average daily screen exposure logged at ${avgScreenTime} hours (prolonged visual display use suppresses normal blink reflex and exacerbates tear breakup time).`
    );
  }

  if (weatherLogs.length > 0) {
    bulletLines.push(
      `• Environmental Humidity: ${lowHumidityEpisodes} of ${weatherLogs.length} episodes occurred during dry ambient air (<35% relative humidity).`
    );
  }

  if (expenses.length > 0) {
    bulletLines.push(
      `• Out-of-Pocket Lubrication Cost: $${totalSpend.toFixed(2)} recorded across ${expenses.length} supply entries.`
    );
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85); // slate-700

  bulletLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, contentWidth);
    checkPageBreak(wrapped.length * 4);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 4 + 1.2;
  });

  y += 4;

  // -------------------------------------------------------------
  // Section 2: Chronological Episode Log Table
  // -------------------------------------------------------------
  checkPageBreak(40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2. EPISODES & RECURRENT EROSIONS CHRONICLE (${totalEpisodes})`, marginX, y);
  y += 5;

  if (episodes.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No acute episodes logged during this timeframe.', marginX, y);
    y += 8;
  } else {
    // Table Header
    const colWidths = {
      date: 30,
      eye: 12,
      severity: 26,
      details: 80,
      env: 34,
    };

    const drawTableHeader = () => {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(marginX, y, contentWidth, 7, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(marginX, y + 7, marginX + contentWidth, y + 7);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      let curX = marginX + 2;
      doc.text('DATE & TIME', curX, y + 4.8);

      curX += colWidths.date;
      doc.text('EYE', curX, y + 4.8);

      curX += colWidths.eye;
      doc.text('SEVERITY', curX, y + 4.8);

      curX += colWidths.severity;
      doc.text('SYMPTOMS & CLINICAL DETAILS', curX, y + 4.8);

      curX += colWidths.details;
      doc.text('WEATHER / ENV', curX, y + 4.8);

      y += 8;
    };

    drawTableHeader();

    episodes.forEach((ep, epIdx) => {
      const dt = new Date(ep.timestamp);
      const dateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
      const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const sev = getSeverityLabel(ep.severity);

      // Symptoms and details text
      const symptomList = ep.symptoms.map(getSymptomLabel).join(', ');
      let detailsText = symptomList;
      if (ep.trigger) detailsText += `\nTrigger: ${ep.trigger}`;
      if (ep.actionTaken) detailsText += `\nAction: ${ep.actionTaken}`;
      if (ep.notes) detailsText += `\nNotes: "${ep.notes}"`;

      const detailsLines = doc.splitTextToSize(detailsText, colWidths.details - 4);

      let weatherText = '';
      if (ep.weather) {
        weatherText = `${ep.weather.humidity}% Hum • ${ep.weather.tempC}°C`;
      }
      if (ep.durationMinutes) {
        weatherText += `\nDuration: ${ep.durationMinutes}m`;
      }
      if (ep.photoUrl) {
        weatherText += `\n[Photo Attached]`;
      }
      const weatherLines = doc.splitTextToSize(weatherText, colWidths.env - 4);

      const rowHeight = Math.max(detailsLines.length * 3.8 + 4, weatherLines.length * 3.8 + 4, 11);

      // Page break check for table row
      if (y + rowHeight > pageHeight - 20) {
        doc.addPage();
        y = 16;
        // Mini running header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(13, 148, 136);
        doc.text('EBMD CORNEAL CLINICAL REPORT (CONTINUED)', marginX, y);
        y += 6;
        drawTableHeader();
      }

      // Zebra striping
      if (epIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y - 1, contentWidth, rowHeight, 'F');
      }

      // Row separator
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(marginX, y + rowHeight - 1, marginX + contentWidth, y + rowHeight - 1);

      let curX = marginX + 2;

      // Date column
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(dateStr, curX, y + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(timeStr, curX, y + 7);

      // Eye column
      curX += colWidths.date;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(ep.eye, curX, y + 4.5);

      // Severity column
      curX += colWidths.eye;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      if (ep.severity >= 4) {
        doc.setTextColor(225, 29, 72); // rose-600
      } else if (ep.severity >= 3) {
        doc.setTextColor(234, 88, 12); // orange-600
      } else {
        doc.setTextColor(13, 148, 136); // teal-600
      }
      doc.text(`Lvl ${ep.severity}`, curX, y + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(sev.label.replace(/^Level \d - /, ''), curX, y + 7);

      // Details column
      curX += colWidths.severity;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(detailsLines, curX, y + 3.5);

      // Weather / Env column
      curX += colWidths.details;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(weatherLines, curX, y + 3.5);

      y += rowHeight;
    });

    y += 4;
  }

  // -------------------------------------------------------------
  // Section 3: Treatment Regimen & Skipped Doses Audit
  // -------------------------------------------------------------
  checkPageBreak(30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. TREATMENT REGIMEN & ADHERENCE AUDIT', marginX, y);
  y += 5;

  const skippedList = treatments.filter((t) => t.skipped && t.skipReason);
  const skippedReasons = Array.from(new Set(skippedList.map((t) => getSkipReasonLabel(t.skipReason))));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);

  const configuredProductNames = settings.configuredProducts
    ? Object.values(settings.configuredProducts)
        .flatMap((products) => products)
        .filter(Boolean)
        .slice(0, 5)
        .join(', ')
    : 'Muro 128 5% Ointment (Bedtime), Preservative-Free Lubricant Drops, Daytime Hypertonic Saline Drops';

  const regimenLines = [
    `• Standard Configured Regimen: ${configuredProductNames || 'Ophthalmic lubricants and hypertonic saline ointment.'}`,
    `• Adherence Status: ${completedTreatments} of ${totalTreatments} scheduled doses logged as successfully applied (${adherenceRate}%).`,
  ];

  if (skippedReasons.length > 0) {
    regimenLines.push(
      `• Skipped Doses Reasons Documented: ${skippedReasons.join(', ')} (${skippedList.length} total skipped events recorded).`
    );
  }

  regimenLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, contentWidth);
    checkPageBreak(wrapped.length * 4);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 4 + 1.2;
  });

  y += 4;

  // -------------------------------------------------------------
  // Section 4: Patient Questions / Topics for Clinician
  // -------------------------------------------------------------
  if (doctorNotes && doctorNotes.trim()) {
    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('4. QUESTIONS & TOPICS FOR CLINICIAN APPOINTMENT', marginX, y);
    y += 5;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);

    const notesLines = doc.splitTextToSize(doctorNotes.trim(), contentWidth - 8);
    const boxHeight = notesLines.length * 4 + 6;

    doc.roundedRect(marginX, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(notesLines, marginX + 4, y + 4.5);

    y += boxHeight + 6;
  }

  // -------------------------------------------------------------
  // Section 5: Clinician Notes & Signature Block
  // -------------------------------------------------------------
  checkPageBreak(35);

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CLINICAL ASSESSMENT & MANAGEMENT PLAN (PHYSICIAN USE):', marginX, y);

  y += 14; // Space for physical handwriting

  // Signature and Date lines
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.4);
  doc.line(marginX, y, marginX + 65, y);
  doc.line(marginX + 80, y, marginX + 115, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Clinician's Signature", marginX, y + 4);
  doc.text('Date', marginX + 80, y + 4);

  doc.text('EBMD Tracker Report • Patient Health Summary', pageWidth - marginX, y + 4, { align: 'right' });

  // -------------------------------------------------------------
  // Page Footers (Page X of Y)
  // -------------------------------------------------------------
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400

    doc.text(
      'CONFIDENTIAL PATIENT CLINICAL DATA • EPITHELIAL BASEMENT MEMBRANE DYSTROPHY',
      marginX,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

export function downloadDoctorReportPdf(data: DoctorReportPdfData): void {
  const doc = generateDoctorReportPdf(data);
  const dateStr = new Date().toISOString().split('T')[0];
  const patientSlug = (data.settings.patientName || 'Patient')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
  const filename = `EBMD_Corneal_Report_${patientSlug}_${dateStr}.pdf`;
  doc.save(filename);
}

export function printDoctorReportPdf(data: DoctorReportPdfData): void {
  // First attempt window.print() if supported, with iframe sandbox handling
  const doc = generateDoctorReportPdf(data);
  const dateStr = new Date().toISOString().split('T')[0];
  const patientSlug = (data.settings.patientName || 'Patient')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
  const filename = `EBMD_Corneal_Report_${patientSlug}_${dateStr}.pdf`;

  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // Create an invisible iframe for direct silent printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.src = blobUrl;

    document.body.appendChild(printFrame);

    printFrame.onload = () => {
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch {
          // Fallback if browser blocks iframe print
          doc.save(filename);
        } finally {
          setTimeout(() => {
            try {
              document.body.removeChild(printFrame);
              URL.revokeObjectURL(blobUrl);
            } catch {
              // ignore
            }
          }, 10000);
        }
      }, 500);
    };
  } catch {
    // If blob or iframe is disallowed, direct save
    doc.save(filename);
  }
}
