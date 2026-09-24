/**
 * EBMD Tracker - Type Definitions
 * Epithelial Basement Membrane Dystrophy & Corneal Care
 */

export type EyeTarget = 'OD' | 'OS' | 'OU'; // OD: Right Eye, OS: Left Eye, OU: Both Eyes

export type SymptomType =
  | 'pain'
  | 'blurry_vision'
  | 'gritty_sandy'
  | 'sharp_waking_tear'
  | 'photophobia'
  | 'foreign_body'
  | 'excessive_tearing'
  | 'hospital_debridement';

export type TreatmentType = 'drops' | 'gel' | 'ointment' | 'other';

export type RoutineAnchor =
  | 'waking'
  | 'morning'
  | 'after_lunch'
  | 'afternoon'
  | 'dinner'
  | 'before_bed'
  | 'middle_of_night'
  | 'as_needed';

export type SkipReason =
  | 'forgot'
  | 'out_of_supply'
  | 'irritated_stinging'
  | 'eyes_felt_good'
  | 'fell_asleep_early'
  | 'travel_away'
  | 'other';

export interface EpisodeLog {
  id: string;
  timestamp: string; // ISO 8601 string
  eye: EyeTarget;
  severity: 1 | 2 | 3 | 4 | 5; // 1: Mild scratchy, 2: Gritty discomfort, 3: Moderate pain/blur, 4: Sharp erosion, 5: Severe tear/debridement
  symptoms: SymptomType[];
  trigger?: string; // e.g. Waking/opening eye, Ceiling fan, Eye rubbing, Dry room, Screen fatigue
  actionTaken?: string; // e.g. Kept eye shut, Cold compress, Muro 128 ointment, Urgent care
  notes?: string;
  durationMinutes?: number;
  photoUrl?: string; // Base64 data URL or IndexedDB reference
  weather?: {
    tempC: number;
    tempF?: number;
    humidity: number; // percentage 0-100
    weatherDesc?: string;
    isManual?: boolean;
  };
}

export interface TreatmentLog {
  id: string;
  timestamp: string; // ISO 8601 string
  type: TreatmentType;
  productName: string; // e.g. 'Muro 128 5% Ointment', 'Systane PF', 'Refresh Celluvisc'
  eye: EyeTarget;
  anchor: RoutineAnchor;
  skipped: boolean;
  skipReason?: SkipReason;
  skipReasonCustom?: string;
  notes?: string;
  screenTimeHours?: number; // Approximate daily screen use hours (0-16)
}

export interface RoutineItem {
  id: string;
  title: string;
  type: TreatmentType;
  productName: string;
  eye: EyeTarget;
  anchor: RoutineAnchor;
  anchorLabel: string; // e.g., 'Upon waking up', 'Before bed'
  enabled: boolean;
  notificationTime?: string; // e.g. '22:30' (approximate reminder trigger)
}

export interface ExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  productName: string;
  category: 'drops' | 'gel' | 'ointment' | 'mask_goggles' | 'prescription' | 'doctor_visit' | 'other';
  price: number;
  quantity: number;
  store?: string;
  notes?: string;
}

export interface ReminderSetting {
  id: string;
  anchor: RoutineAnchor;
  label: string;
  approxTime: string; // HH:mm
  description: string;
  enabled: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  calmEyeMode: boolean; // Softer contrast, reduced glare
  largeTouchTargets: boolean; // Extra padded UI for blurry/painful vision
  remindersEnabled: boolean;
  soundEnabled: boolean;
  patientName?: string;
  doctorName?: string;
  clinicName?: string;
  configuredProducts?: Record<TreatmentType, string[]>;
}

export interface DateRangeFilter {
  preset: 'today' | '7d' | '30d' | '90d' | 'year' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}
