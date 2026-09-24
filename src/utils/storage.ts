/**
 * EBMD Tracker - Storage and State Engine
 * Local-first persistence via localStorage with export/import and sample data
 */

import {
  EpisodeLog,
  TreatmentLog,
  ExpenseItem,
  RoutineItem,
  ReminderSetting,
  AppSettings,
  EyeTarget,
  TreatmentType,
} from '../types/ebmd';

const STORAGE_KEYS = {
  EPISODES: 'ebmd_episodes_v1',
  TREATMENTS: 'ebmd_treatments_v1',
  EXPENSES: 'ebmd_expenses_v1',
  ROUTINES: 'ebmd_routines_v1',
  REMINDERS: 'ebmd_reminders_v1',
  SETTINGS: 'ebmd_settings_v1',
  INITIALIZED: 'ebmd_initialized_v1',
};

export const DEFAULT_ROUTINES: RoutineItem[] = [
  {
    id: 'r_waking',
    title: 'Morning Hypertonic / PF Drops',
    type: 'drops',
    productName: 'Muro 128 5% Drops (or PF Artificial Tears)',
    eye: 'OU',
    anchor: 'waking',
    anchorLabel: 'Upon waking (before moving eyelids harshly)',
    enabled: true,
    notificationTime: '07:30',
  },
  {
    id: 'r_lunch',
    title: 'Midday Lubricating Tears',
    type: 'drops',
    productName: 'Systane Complete PF / Refresh Optive',
    eye: 'OU',
    anchor: 'after_lunch',
    anchorLabel: 'After lunch / midday screen break',
    enabled: true,
    notificationTime: '13:00',
  },
  {
    id: 'r_evening',
    title: 'Evening Lubricating Gel',
    type: 'gel',
    productName: 'Systane Gel Drops / Refresh Celluvisc',
    eye: 'OU',
    anchor: 'dinner',
    anchorLabel: 'After dinner / early evening',
    enabled: true,
    notificationTime: '19:30',
  },
  {
    id: 'r_bed',
    title: 'Bedtime Corneal Shield Ointment',
    type: 'ointment',
    productName: 'Muro 128 5% Ointment (or Refresh PM)',
    eye: 'OU',
    anchor: 'before_bed',
    anchorLabel: 'Right before lights out & sleep mask',
    enabled: true,
    notificationTime: '22:30',
  },
];

export const DEFAULT_REMINDERS: ReminderSetting[] = [
  {
    id: 'rem_waking',
    anchor: 'waking',
    label: 'Upon waking',
    approxTime: '07:30',
    description: 'Instill morning drops before rubbing or fast eyelid opening.',
    enabled: true,
  },
  {
    id: 'rem_lunch',
    anchor: 'after_lunch',
    label: 'After lunch',
    approxTime: '13:00',
    description: 'Rehydrate cornea with preservative-free tears.',
    enabled: true,
  },
  {
    id: 'rem_dinner',
    anchor: 'dinner',
    label: 'After dinner',
    approxTime: '19:30',
    description: 'Evening gel to prepare cornea for sleep transition.',
    enabled: false,
  },
  {
    id: 'rem_bed',
    anchor: 'before_bed',
    label: 'Before bed',
    approxTime: '22:30',
    description: 'Apply thick night ointment (vital barrier against morning eyelid adhesion).',
    enabled: true,
  },
];

export const DEFAULT_COMMON_PRODUCTS: Record<TreatmentType, string[]> = {
  drops: [
    'Muro 128 5% Hypertonic Drops',
    'Systane Complete PF',
    'Refresh Optive Mega-3',
    'Thealoz Duo Drops',
    'Retaine MGD Emulsion',
    'Autologous Serum Tears',
  ],
  gel: [
    'Systane Gel Drops',
    'Refresh Celluvisc',
    'Thealoz Duo Gel',
    'GenTeal Severe Dry Eye Gel',
  ],
  ointment: [
    'Muro 128 5% Hypertonic Ointment',
    'Refresh PM Night Ointment',
    'GenTeal Tears PM Ointment',
    'Systane Nighttime Lubricant Ointment',
    'Erythromycin Ophthalmic Ointment',
  ],
  other: [
    'Eye Eco Eyeseals 4.0 Sleep Mask',
    'Warm Compress Therapy',
    'Punctal Plugs',
    'Oral Doxycycline 50mg',
  ],
};

export function getConfiguredProducts(settings?: Partial<AppSettings> | null): Record<TreatmentType, string[]> {
  if (!settings?.configuredProducts) {
    return { ...DEFAULT_COMMON_PRODUCTS };
  }
  return {
    drops: settings.configuredProducts.drops && settings.configuredProducts.drops.length > 0
      ? settings.configuredProducts.drops
      : DEFAULT_COMMON_PRODUCTS.drops,
    gel: settings.configuredProducts.gel && settings.configuredProducts.gel.length > 0
      ? settings.configuredProducts.gel
      : DEFAULT_COMMON_PRODUCTS.gel,
    ointment: settings.configuredProducts.ointment && settings.configuredProducts.ointment.length > 0
      ? settings.configuredProducts.ointment
      : DEFAULT_COMMON_PRODUCTS.ointment,
    other: settings.configuredProducts.other && settings.configuredProducts.other.length > 0
      ? settings.configuredProducts.other
      : DEFAULT_COMMON_PRODUCTS.other,
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark', // Dark mode default protects light-sensitive corneal erosion eyes!
  calmEyeMode: true,
  largeTouchTargets: true,
  remindersEnabled: true,
  soundEnabled: true,
  patientName: '',
  doctorName: '',
  clinicName: '',
  configuredProducts: DEFAULT_COMMON_PRODUCTS,
};

// Generates a realistic 30-day baseline dataset for new users
export function generateSampleData(): {
  episodes: EpisodeLog[];
  treatments: TreatmentLog[];
  expenses: ExpenseItem[];
} {
  const now = new Date();
  const episodes: EpisodeLog[] = [];
  const treatments: TreatmentLog[] = [];
  const expenses: ExpenseItem[] = [];

  // Generate realistic 28-day routine
  for (let d = 27; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateStr = dayDate.toISOString().split('T')[0];

    // Simulate 3 missed night ointment days
    const missedNight = d === 21 || d === 12 || d === 4;
    const missedLunch = d === 18 || d === 9 || d === 2;

    // Morning drops
    treatments.push({
      id: `treat_${dateStr}_waking`,
      timestamp: `${dateStr}T07:35:00.000Z`,
      type: 'drops',
      productName: 'Muro 128 5% Drops',
      eye: 'OU',
      anchor: 'waking',
      skipped: false,
      notes: 'Instilled 2 mins after gentle eye opening',
    });

    // Lunch drops
    treatments.push({
      id: `treat_${dateStr}_lunch`,
      timestamp: `${dateStr}T13:10:00.000Z`,
      type: 'drops',
      productName: 'Systane Complete PF',
      eye: 'OU',
      anchor: 'after_lunch',
      skipped: missedLunch,
      skipReason: missedLunch ? 'out_of_supply' : undefined,
      notes: missedLunch ? 'Left vial in car' : undefined,
    });

    // Night ointment
    treatments.push({
      id: `treat_${dateStr}_bed`,
      timestamp: `${dateStr}T22:45:00.000Z`,
      type: 'ointment',
      productName: 'Muro 128 5% Ointment',
      eye: 'OU',
      anchor: 'before_bed',
      skipped: missedNight,
      skipReason: missedNight ? 'fell_asleep_early' : undefined,
      notes: missedNight ? 'Exhausted, fell asleep without ointment' : '1/4 inch ribbon into lower fornix',
    });
  }

  // Realistic EBMD Episodes (correlated closely with missed night ointment or dry ceiling fan!)
  // Episode 1: 20 days ago (morning sharp tear after missed ointment d=21)
  const epDate1 = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  episodes.push({
    id: 'ep_1',
    timestamp: `${epDate1.toISOString().split('T')[0]}T06:40:00.000Z`,
    eye: 'OS', // Left Eye
    severity: 4,
    symptoms: ['sharp_waking_tear', 'pain', 'photophobia', 'excessive_tearing'],
    trigger: 'Waking up / opening eye (missed ointment night before)',
    actionTaken: 'Kept eye firmly shut 20 min, instilled chilled preservative-free tears, cold compress',
    notes: 'Severe sharp pulling pain upon alarm ringing. Left eye eyelid stuck to epithelial flap. Photophobia lasted 4 hours.',
    durationMinutes: 240,
  });

  // Episode 2: 15 days ago (afternoon gritty feeling)
  const epDate2 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  episodes.push({
    id: 'ep_2',
    timestamp: `${epDate2.toISOString().split('T')[0]}T15:20:00.000Z`,
    eye: 'OU',
    severity: 2,
    symptoms: ['gritty_sandy', 'blurry_vision', 'foreign_body'],
    trigger: 'Air conditioning / 6 hrs computer screen time',
    actionTaken: 'Systane PF drops + 15 min rest away from monitor',
    notes: 'Both eyes scratchy like sand under upper eyelids.',
    durationMinutes: 60,
  });

  // Episode 3: 11 days ago (another wake-up erosion after missed ointment d=12)
  const epDate3 = new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000);
  episodes.push({
    id: 'ep_3',
    timestamp: `${epDate3.toISOString().split('T')[0]}T07:05:00.000Z`,
    eye: 'OS',
    severity: 3,
    symptoms: ['sharp_waking_tear', 'pain', 'blurry_vision'],
    trigger: 'Waking up with ceiling fan on high',
    actionTaken: 'Muro 128 drops + sunglasses indoors',
    notes: 'Pain level 6/10 initially, eased to 3/10 after 1 hour.',
    durationMinutes: 120,
  });

  // Episode 4: 3 days ago (major erosion leading to eye clinic visit)
  const epDate4 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  episodes.push({
    id: 'ep_4',
    timestamp: `${epDate4.toISOString().split('T')[0]}T06:15:00.000Z`,
    eye: 'OD', // Right Eye
    severity: 5,
    symptoms: ['sharp_waking_tear', 'pain', 'hospital_debridement', 'photophobia', 'excessive_tearing'],
    trigger: 'Woke up, rubbed right eye accidentally before full waking',
    actionTaken: 'Walk-in cornea specialist clinic: fluorescein stain showed 2mm epithelial defect, loose flap debrided, Bandage Contact Lens (BCL) placed',
    notes: 'Very painful RCE episode. Doctor prescribed Vigamox drops + BCL for 6 days.',
    durationMinutes: 480,
  });

  // Sample Expenses
  const expDate1 = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const expDate2 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const expDate3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  expenses.push(
    {
      id: 'exp_1',
      date: expDate1,
      productName: 'Muro 128 5% Ointment (3.5g tube)',
      category: 'ointment',
      price: 28.99,
      quantity: 2,
      store: 'Walgreens Pharmacy',
      notes: 'Bedtime staple. Lasts approx 4-6 weeks.',
    },
    {
      id: 'exp_2',
      date: expDate1,
      productName: 'Systane Complete Preservative-Free (60 vials)',
      category: 'drops',
      price: 21.49,
      quantity: 1,
      store: 'Amazon',
      notes: 'Daytime lubrication vials.',
    },
    {
      id: 'exp_3',
      date: expDate2,
      productName: 'Eye Eco Eyeseals 4.0 Hydrating Sleep Shield',
      category: 'mask_goggles',
      price: 44.5,
      quantity: 1,
      store: 'Dry Eye Shop Online',
      notes: 'Prevents eyelid drying and drafts from ceiling fan.',
    },
    {
      id: 'exp_4',
      date: expDate3,
      productName: 'Cornea Specialist Urgent Visit Copay + Fluorescein',
      category: 'doctor_visit',
      price: 50.0,
      quantity: 1,
      store: 'Eye Clinic / Cornea Institute',
      notes: 'Epithelial debridement + Bandage Contact Lens insertion.',
    },
  );

  return { episodes, treatments, expenses };
}

// Storage Helpers
export function loadEpisodes(): EpisodeLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EPISODES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveEpisodes(episodes: EpisodeLog[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(episodes));
  } catch (err) {
    console.error('Failed to save episodes:', err);
  }
}

export function loadTreatments(): TreatmentLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TREATMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTreatments(treatments: TreatmentLog[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TREATMENTS, JSON.stringify(treatments));
  } catch (err) {
    console.error('Failed to save treatments:', err);
  }
}

export function loadExpenses(): ExpenseItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: ExpenseItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed to save expenses:', err);
  }
}

export function loadRoutines(): RoutineItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTINES);
    if (!raw) return DEFAULT_ROUTINES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ROUTINES;
  }
}

export function saveRoutines(routines: RoutineItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
  } catch (err) {
    console.error('Failed to save routines:', err);
  }
}

export function loadReminders(): ReminderSetting[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    if (!raw) return DEFAULT_REMINDERS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export function saveReminders(reminders: ReminderSetting[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  } catch (err) {
    console.error('Failed to save reminders:', err);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      configuredProducts: getConfiguredProducts(parsed),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

// Initial Bootstrap Check: if empty, seed with sample data so user immediately sees value
export function initStorageIfEmpty(): { isFirstRun: boolean } {
  try {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInitialized) {
      const sample = generateSampleData();
      saveEpisodes(sample.episodes);
      saveTreatments(sample.treatments);
      saveExpenses(sample.expenses);
      saveRoutines(DEFAULT_ROUTINES);
      saveReminders(DEFAULT_REMINDERS);
      saveSettings(DEFAULT_SETTINGS);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return { isFirstRun: true };
    }
    return { isFirstRun: false };
  } catch {
    return { isFirstRun: false };
  }
}

// Full Reset to blank / clear data
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.EPISODES);
    localStorage.removeItem(STORAGE_KEYS.TREATMENTS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    saveEpisodes([]);
    saveTreatments([]);
    saveExpenses([]);
  } catch (err) {
    console.error('Failed to clear data', err);
  }
}

// Reset to fresh sample dataset
export function resetToSampleData() {
  const sample = generateSampleData();
  saveEpisodes(sample.episodes);
  saveTreatments(sample.treatments);
  saveExpenses(sample.expenses);
  saveRoutines(DEFAULT_ROUTINES);
  saveReminders(DEFAULT_REMINDERS);
}

// JSON Backup & Restore
export function exportAllDataAsJSON(): string {
  const data = {
    app: 'EBMD Tracker',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    episodes: loadEpisodes(),
    treatments: loadTreatments(),
    expenses: loadExpenses(),
    routines: loadRoutines(),
    reminders: loadReminders(),
    settings: loadSettings(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllDataFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data.episodes)) saveEpisodes(data.episodes);
    if (Array.isArray(data.treatments)) saveTreatments(data.treatments);
    if (Array.isArray(data.expenses)) saveExpenses(data.expenses);
    if (Array.isArray(data.routines)) saveRoutines(data.routines);
    if (Array.isArray(data.reminders)) saveReminders(data.reminders);
    if (data.settings && typeof data.settings === 'object') saveSettings(data.settings);
    return true;
  } catch (err) {
    console.error('Import failed', err);
    return false;
  }
}

// Eye display labels
export function getEyeLabel(eye: EyeTarget): string {
  switch (eye) {
    case 'OD':
      return 'Right Eye (OD)';
    case 'OS':
      return 'Left Eye (OS)';
    case 'OU':
      return 'Both Eyes (OU)';
    default:
      return eye;
  }
}

export function getEyeShort(eye: EyeTarget): string {
  switch (eye) {
    case 'OD':
      return 'Right OD';
    case 'OS':
      return 'Left OS';
    case 'OU':
      return 'Both OU';
    default:
      return eye;
  }
}

export function getSeverityLabel(severity: number): { label: string; color: string; desc: string } {
  switch (severity) {
    case 1:
      return {
        label: 'Level 1: Mild',
        color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        desc: 'Slight scratchy or gritty sensation, no sharp erosion',
      };
    case 2:
      return {
        label: 'Level 2: Discomfort',
        color: 'text-teal-500 dark:text-teal-400 bg-teal-500/10 border-teal-500/20',
        desc: 'Noticeable sandy grit, watering, mild blur',
      };
    case 3:
      return {
        label: 'Level 3: Moderate',
        color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        desc: 'Painful corneal friction, light sensitivity, blur',
      };
    case 4:
      return {
        label: 'Level 4: Sharp Erosion',
        color: 'text-orange-500 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
        desc: 'Sharp tearing pain upon opening, severe photophobia',
      };
    case 5:
      return {
        label: 'Level 5: Severe / Clinic',
        color: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
        desc: 'Excruciating tear, hospital/clinic debridement or BCL required',
      };
    default:
      return {
        label: `Level ${severity}`,
        color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
        desc: '',
      };
  }
}

export function getSymptomLabel(sym: string): string {
  const map: Record<string, string> = {
    pain: 'Sharp Eye Pain',
    blurry_vision: 'Blurry Vision',
    gritty_sandy: 'Gritty / Sandy Discomfort',
    sharp_waking_tear: 'Sharp Morning Opening Pain',
    photophobia: 'Photophobia (Light Sensitive)',
    foreign_body: 'Foreign Body Sensation',
    excessive_tearing: 'Excessive Tearing (Epiphora)',
    hospital_debridement: 'Clinic Visit / Debridement',
  };
  return map[sym] || sym;
}

export function getSkipReasonLabel(reason?: string): string {
  const map: Record<string, string> = {
    forgot: 'Forgot / distracted',
    out_of_supply: 'Ran out of drops/ointment',
    irritated_stinging: 'Stinging / eye too sensitive',
    eyes_felt_good: 'Eyes felt comfortable',
    fell_asleep_early: 'Fell asleep before applying',
    travel_away: 'Away from home / forgot kit',
    other: 'Other reason',
  };
  return (reason && map[reason]) || reason || 'Not specified';
}

export function getAnchorLabel(anchor: string): string {
  const map: Record<string, string> = {
    waking: 'Upon Waking',
    morning: 'Morning',
    after_lunch: 'After Lunch',
    afternoon: 'Afternoon',
    dinner: 'After Dinner',
    before_bed: 'Before Bed',
    middle_of_night: 'Middle of Night',
    as_needed: 'As Needed',
  };
  return map[anchor] || anchor;
}
