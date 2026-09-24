import React, { useState, useEffect } from 'react';
import { X, Droplets, Clock, Check, Eye, AlertTriangle, ShieldCheck, Settings } from 'lucide-react';
import { TreatmentLog, TreatmentType, EyeTarget, RoutineAnchor, SkipReason } from '../types/ebmd';
import { getAnchorLabel, getSkipReasonLabel } from '../utils/storage';
import { sound } from '../utils/audio';

interface QuickTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (treatment: TreatmentLog) => void;
  initialData?: TreatmentLog | null;
  soundEnabled?: boolean;
  preselectedType?: TreatmentType;
  preselectedAnchor?: RoutineAnchor;
  configuredProducts?: Record<TreatmentType, string[]>;
  onManageProducts?: () => void;
}

const COMMON_PRODUCTS: Record<TreatmentType, string[]> = {
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

const SKIP_REASONS: { id: SkipReason; label: string }[] = [
  { id: 'forgot', label: 'Forgot / distracted' },
  { id: 'fell_asleep_early', label: 'Fell asleep early before applying' },
  { id: 'out_of_supply', label: 'Ran out of supply' },
  { id: 'irritated_stinging', label: 'Stinging / eye too sensitive' },
  { id: 'eyes_felt_good', label: 'Eyes felt good / skipped intentionally' },
  { id: 'travel_away', label: 'Traveling / forgot medication kit' },
  { id: 'other', label: 'Other reason' },
];

export const QuickTreatmentModal: React.FC<QuickTreatmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  soundEnabled = true,
  preselectedType,
  preselectedAnchor,
  configuredProducts,
  onManageProducts,
}) => {
  const getLocalDateTimeString = (date = new Date()) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [dateTime, setDateTime] = useState<string>(getLocalDateTimeString());
  const [type, setType] = useState<TreatmentType>(preselectedType || 'drops');
  const [productName, setProductName] = useState<string>('Systane Complete PF');
  const [isCustomProduct, setIsCustomProduct] = useState<boolean>(false);
  const [eye, setEye] = useState<EyeTarget>('OU');
  const [anchor, setAnchor] = useState<RoutineAnchor>(preselectedAnchor || 'after_lunch');
  const [skipped, setSkipped] = useState<boolean>(false);
  const [skipReason, setSkipReason] = useState<SkipReason>('forgot');
  const [skipReasonCustom, setSkipReasonCustom] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const activeProducts = (configuredProducts && configuredProducts[type]?.length > 0)
    ? configuredProducts[type]
    : (COMMON_PRODUCTS[type] || []);

  useEffect(() => {
    if (initialData) {
      const d = new Date(initialData.timestamp);
      setDateTime(getLocalDateTimeString(d));
      setType(initialData.type);
      setProductName(initialData.productName);
      const categoryList = (configuredProducts && configuredProducts[initialData.type]?.length > 0)
        ? configuredProducts[initialData.type]
        : COMMON_PRODUCTS[initialData.type];
      const isPreset = categoryList?.includes(initialData.productName);
      setIsCustomProduct(!isPreset);
      setEye(initialData.eye);
      setAnchor(initialData.anchor);
      setSkipped(initialData.skipped);
      setSkipReason(initialData.skipReason || 'forgot');
      setSkipReasonCustom(initialData.skipReasonCustom || '');
      setNotes(initialData.notes || '');
    } else {
      setDateTime(getLocalDateTimeString());
      const chosenType = preselectedType || 'drops';
      setType(chosenType);
      const chosenList = (configuredProducts && configuredProducts[chosenType]?.length > 0)
        ? configuredProducts[chosenType]
        : COMMON_PRODUCTS[chosenType];
      const defaultProd = chosenList?.[0] || (
        chosenType === 'ointment'
          ? 'Muro 128 5% Hypertonic Ointment'
          : chosenType === 'gel'
          ? 'Systane Gel Drops'
          : chosenType === 'drops'
          ? 'Systane Complete PF'
          : 'Eye Eco Eyeseals 4.0 Sleep Mask'
      );
      setProductName(defaultProd);
      setIsCustomProduct(false);
      setEye('OU');
      setAnchor(preselectedAnchor || (chosenType === 'ointment' ? 'before_bed' : 'after_lunch'));
      setSkipped(false);
      setSkipReason('forgot');
      setSkipReasonCustom('');
      setNotes('');
    }
  }, [initialData, isOpen, preselectedType, preselectedAnchor, configuredProducts]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TreatmentType) => {
    setType(newType);
    setIsCustomProduct(false);
    const typeList = (configuredProducts && configuredProducts[newType]?.length > 0)
      ? configuredProducts[newType]
      : COMMON_PRODUCTS[newType];
    const defaultProd = typeList?.[0] || (
      newType === 'ointment'
        ? 'Muro 128 5% Hypertonic Ointment'
        : newType === 'gel'
        ? 'Systane Gel Drops'
        : newType === 'drops'
        ? 'Systane Complete PF'
        : 'Eye Eco Eyeseals 4.0 Sleep Mask'
    );
    setProductName(defaultProd);
    if (newType === 'ointment' && !initialData) {
      setAnchor('before_bed');
    }
    if (soundEnabled) sound.playGentleBeep(450, 0.05);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const treatment: TreatmentLog = {
      id: initialData?.id || `treat_${Date.now()}`,
      timestamp: new Date(dateTime).toISOString(),
      type,
      productName: productName.trim() || 'Eye Lubricant',
      eye,
      anchor,
      skipped,
      skipReason: skipped ? skipReason : undefined,
      skipReasonCustom: skipped && skipReason === 'other' ? skipReasonCustom.trim() : undefined,
      notes: notes.trim() || undefined,
      screenTimeHours: initialData?.screenTimeHours,
    };

    if (soundEnabled) sound.playGentleBeep(580, 0.12);
    onSave(treatment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {initialData ? 'Edit Treatment Log' : 'Log Daily Eye Care'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track drops, gel, and bedtime ointment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-sm">
          {/* Status: Used vs Skipped Toggle */}
          <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Treatment Adherence Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSkipped(false);
                  if (soundEnabled) sound.playGentleBeep(520, 0.05);
                }}
                className={`py-3 px-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition active:scale-95 ${
                  !skipped
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Instilled / Applied</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSkipped(true);
                  if (soundEnabled) sound.playGentleBeep(380, 0.05);
                }}
                className={`py-3 px-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition active:scale-95 ${
                  skipped
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Skipped Dosing</span>
              </button>
            </div>

            {/* Skipped reason selection */}
            {skipped && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 animate-in fade-in">
                <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                  Reason for Skipping (Helps doctor understand patterns)
                </label>
                <div className="grid grid-cols-1 gap-1.5 mb-2">
                  {SKIP_REASONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSkipReason(r.id)}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-medium border transition ${
                        skipReason === r.id
                          ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500 font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {skipReason === 'other' && (
                  <input
                    type="text"
                    placeholder="Specify other reason..."
                    value={skipReasonCustom}
                    onChange={(e) => setSkipReasonCustom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500"
                  />
                )}
              </div>
            )}
          </div>

          {/* 1. Treatment Category (Drops, Gel, Ointment, Other) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'drops', label: '💧 Drops' },
                  { id: 'gel', label: '🧴 Gel' },
                  { id: 'ointment', label: '🛡️ Ointment' },
                  { id: 'other', label: '✨ Other' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleTypeChange(cat.id)}
                  className={`py-2.5 px-1 rounded-xl text-xs font-bold border transition text-center min-h-[46px] active:scale-95 ${
                    type === cat.id
                      ? 'bg-teal-600 text-white border-teal-600 shadow'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Product Name with chips (Only show text field if custom product is selected) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Product / Brand
              </label>
              {onManageProducts && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManageProducts();
                  }}
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition flex items-center gap-1 cursor-pointer"
                  title="Configure default product and brand names in Settings"
                >
                  <Settings className="w-3 h-3" />
                  <span>Configure brands</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {activeProducts.map((prod) => {
                const isSelected = !isCustomProduct && productName === prod;
                return (
                  <button
                    key={prod}
                    type="button"
                    onClick={() => {
                      setProductName(prod);
                      setIsCustomProduct(false);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-teal-700 text-white font-semibold border-teal-700 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {prod}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setIsCustomProduct(true);
                  if (!isCustomProduct) setProductName('');
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  isCustomProduct
                    ? 'bg-teal-700 text-white font-semibold border-teal-700 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                + Custom Brand
              </button>
            </div>

            {/* ONLY show text field when user selects custom product */}
            {isCustomProduct && (
              <input
                type="text"
                placeholder="Enter custom product name (e.g. Bausch + Lomb Lumify)..."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 animate-in fade-in"
                autoFocus
              />
            )}
          </div>

          {/* 3. Routine Anchor (e.g. Waking up, After lunch, Before bed) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Routine Anchor
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'waking', label: '🌅 Waking up' },
                  { id: 'morning', label: '☀️ Morning' },
                  { id: 'after_lunch', label: '🥪 After lunch' },
                  { id: 'afternoon', label: '☕ Afternoon' },
                  { id: 'dinner', label: '🍲 After dinner' },
                  { id: 'before_bed', label: '🌙 Before bed' },
                  { id: 'middle_of_night', label: '🌌 Night waking' },
                  { id: 'as_needed', label: '⚡ As needed' },
                ] as const
              ).map((anc) => (
                <button
                  key={anc.id}
                  type="button"
                  onClick={() => setAnchor(anc.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition text-center truncate ${
                    anchor === anc.id
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold border-transparent shadow'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {anc.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Target Eye */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Target Eye
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'OU', label: 'Both Eyes (OU)' },
                  { id: 'OS', label: 'Left Eye (OS)' },
                  { id: 'OD', label: 'Right Eye (OD)' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEye(item.id)}
                  className={`py-2.5 px-2 rounded-xl font-bold text-xs border transition ${
                    eye === item.id
                      ? 'bg-teal-600 text-white border-teal-600 shadow'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Timestamp</span>
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* 6. Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Mild stinging for 30s, or put sleep mask on after"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[48px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold transition shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Check className="w-5 h-5" />
              <span>{initialData ? 'Update Treatment' : 'Save Treatment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
