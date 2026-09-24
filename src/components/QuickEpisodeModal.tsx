import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertCircle,
  Check,
  Clock,
  Eye,
  Zap,
  ShieldAlert,
  Sparkles,
  Mic,
  MicOff,
  Camera,
  Image as ImageIcon,
  Trash2,
  CloudSun,
  Droplets,
  RefreshCw,
  Edit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { EpisodeLog, EyeTarget, SymptomType } from '../types/ebmd';
import { getSeverityLabel, getEyeLabel } from '../utils/storage';
import { sound } from '../utils/audio';
import { compressImageFile, savePhotoToDB, getPhotoFromDB } from '../utils/indexedDB';
import { fetchCurrentWeather, WeatherData } from '../utils/weather';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  parseVoiceTranscript,
} from '../utils/speech';

interface QuickEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (episode: EpisodeLog) => void;
  initialData?: EpisodeLog | null;
  soundEnabled?: boolean;
}

const ALL_SYMPTOMS: { id: SymptomType; label: string; icon: string }[] = [
  { id: 'sharp_waking_tear', label: 'Morning Opening Pain', icon: '🌅' },
  { id: 'pain', label: 'Sharp Eye Pain', icon: '⚡' },
  { id: 'gritty_sandy', label: 'Gritty / Sandy Discomfort', icon: '🏖️' },
  { id: 'blurry_vision', label: 'Blurry Vision', icon: '👓' },
  { id: 'photophobia', label: 'Light Sensitivity (Photophobia)', icon: '☀️' },
  { id: 'foreign_body', label: 'Foreign Body (Eyelash) Feeling', icon: '👁️' },
  { id: 'excessive_tearing', label: 'Excessive Tearing (Epiphora)', icon: '💧' },
  { id: 'hospital_debridement', label: 'Hospital / Clinic Debridement', icon: '🏥' },
];

const COMMON_TRIGGERS = [
  'Waking up / opening eyelid',
  'Rubbed eye during sleep',
  'Ceiling fan or dry AC breeze',
  'Low room humidity',
  'Prolonged screen fatigue',
  'Spontaneous / Unknown',
  'Other / Custom',
];

export const QuickEpisodeModal: React.FC<QuickEpisodeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  soundEnabled = true,
}) => {
  const getLocalDateTimeString = (date = new Date()) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [dateTime, setDateTime] = useState<string>(getLocalDateTimeString());
  const [eye, setEye] = useState<EyeTarget>('OS');
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [symptoms, setSymptoms] = useState<SymptomType[]>(['sharp_waking_tear', 'pain']);
  const [trigger, setTrigger] = useState<string>('Waking up / opening eyelid');
  const [actionTaken, setActionTaken] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progressive disclosure states
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(false);
  const [showMoreSymptoms, setShowMoreSymptoms] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Photo state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [manualHumidity, setManualHumidity] = useState<string>('');

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const speechRecognizerRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  // Auto-fetch weather on mount/open
  useEffect(() => {
    if (!isOpen) return;

    if (initialData?.weather) {
      setWeather(initialData.weather);
      setManualHumidity(initialData.weather.humidity.toString());
    } else {
      setIsFetchingWeather(true);
      fetchCurrentWeather()
        .then((w) => {
          if (w) {
            setWeather(w);
            setManualHumidity(w.humidity.toString());
          }
        })
        .finally(() => setIsFetchingWeather(false));
    }
  }, [isOpen, initialData]);

  // Load photo from IndexedDB if editing
  useEffect(() => {
    if (initialData) {
      const d = new Date(initialData.timestamp);
      setDateTime(getLocalDateTimeString(d));
      setEye(initialData.eye);
      setSeverity(initialData.severity);
      setSymptoms(initialData.symptoms || []);
      setTrigger(initialData.trigger || '');
      setActionTaken(initialData.actionTaken || '');
      setNotes(initialData.notes || '');

      if (initialData.photoUrl) {
        setPhotoUrl(initialData.photoUrl);
      } else {
        // Try to fetch from IndexedDB
        getPhotoFromDB(initialData.id).then((p) => {
          if (p) setPhotoUrl(p);
        });
      }

      // Check if any non-default symptoms are present
      const common4 = ['sharp_waking_tear', 'pain', 'gritty_sandy', 'blurry_vision'];
      const hasSecondary = (initialData.symptoms || []).some((s) => !common4.includes(s));
      if (hasSecondary) setShowMoreSymptoms(true);

      // Check if trigger, actionTaken, or notes are present
      const hasExtraDetails = !!(
        initialData.trigger ||
        initialData.actionTaken ||
        initialData.notes
      );
      if (hasExtraDetails) setShowDetails(true);
    } else {
      setDateTime(getLocalDateTimeString());
      setEye('OS');
      setSeverity(3);
      setSymptoms(['sharp_waking_tear', 'pain']);
      setTrigger('Waking up / opening eyelid');
      setActionTaken('');
      setNotes('');
      setPhotoUrl(null);
      setIsWeatherExpanded(false);
      setShowMoreSymptoms(false);
      setShowDetails(false);
    }
  }, [initialData, isOpen]);

  // Handle Photo selection
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1000, 0.8);
      setPhotoUrl(compressed);
      if (soundEnabled) sound.playGentleBeep(600, 0.08);
    } catch (err) {
      console.error('Photo compression error:', err);
    }
  };

  // Toggle Voice Recognition
  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Speech Recognition is not supported by this browser. Please type notes manually.');
      return;
    }

    if (isListening) {
      speechRecognizerRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (soundEnabled) sound.playGentleBeep(700, 0.1);
    setIsListening(true);
    setVoiceNotice('Listening... speak clearly (e.g. "Sharp pain, level 4, left eye, waking up")');

    const recognizer = createSpeechRecognizer(
      (transcript, isFinal) => {
        if (isFinal) {
          const parsed = parseVoiceTranscript(transcript);
          if (parsed.severity) setSeverity(parsed.severity as any);
          if (parsed.eye) setEye(parsed.eye);
          if (parsed.symptoms.length > 0) setSymptoms(parsed.symptoms);
          if (parsed.trigger) setTrigger(parsed.trigger);

          // Append to notes
          setNotes((prev) => (prev ? `${prev} | Spoken: "${transcript}"` : transcript));
          setVoiceNotice(`Transcribed: "${transcript}"`);
          if (soundEnabled) sound.playGentleBeep(880, 0.12);
        }
      },
      (err) => {
        console.warn('Speech error:', err);
        setVoiceNotice('Voice recognition ended or timed out.');
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    if (recognizer) {
      speechRecognizerRef.current = recognizer;
      recognizer.start();
    }
  };

  const handleRefreshWeather = () => {
    setIsFetchingWeather(true);
    fetchCurrentWeather()
      .then((w) => {
        if (w) {
          setWeather(w);
          setManualHumidity(w.humidity.toString());
        }
      })
      .finally(() => setIsFetchingWeather(false));
  };

  if (!isOpen) return null;

  const toggleSymptom = (sym: SymptomType) => {
    if (symptoms.includes(sym)) {
      setSymptoms(symptoms.filter((s) => s !== sym));
    } else {
      setSymptoms([...symptoms, sym]);
    }
  };

  // 1-Tap Fast Presets for sub-10s logging
  const applyPreset = (preset: 'waking_erosion' | 'mild_gritty' | 'severe_tear') => {
    if (preset === 'waking_erosion') {
      setSeverity(4);
      setSymptoms(['sharp_waking_tear', 'pain', 'photophobia']);
      setTrigger('Waking up / opening eyelid');
      setActionTaken('Kept eyes shut, cold compress');
    } else if (preset === 'mild_gritty') {
      setSeverity(2);
      setSymptoms(['gritty_sandy', 'blurry_vision']);
      setTrigger('Prolonged screen fatigue');
      setActionTaken('Instilled PF tears');
    } else if (preset === 'severe_tear') {
      setSeverity(5);
      setSymptoms(['sharp_waking_tear', 'pain', 'hospital_debridement', 'excessive_tearing']);
      setTrigger('Waking up / opening eyelid');
      setActionTaken('Visited eye clinic for debridement / BCL');
    }
    if (soundEnabled) sound.playGentleBeep(640, 0.08);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const episodeId = initialData?.id || `ep_${Date.now()}`;

    // Store photo in IndexedDB
    if (photoUrl) {
      await savePhotoToDB(episodeId, photoUrl);
    }

    // Weather payload
    let finalWeather = weather;
    if (manualHumidity) {
      const humNum = parseInt(manualHumidity, 10);
      if (!isNaN(humNum)) {
        finalWeather = {
          tempC: weather?.tempC || 20,
          tempF: weather?.tempF || 68,
          humidity: humNum,
          weatherDesc: humNum < 35 ? 'Dry Air (High Risk)' : 'Normal Air',
          isManual: true,
        };
      }
    }

    const episode: EpisodeLog = {
      id: episodeId,
      timestamp: new Date(dateTime).toISOString(),
      eye,
      severity,
      symptoms: symptoms.length > 0 ? symptoms : ['pain'],
      trigger: trigger.trim() || undefined,
      actionTaken: actionTaken.trim() || undefined,
      notes: notes.trim() || undefined,
      photoUrl: photoUrl || undefined,
      weather: finalWeather || undefined,
    };

    if (soundEnabled) sound.playGentleBeep(520, 0.15);
    onSave(episode);
    setIsSubmitting(false);
    onClose();
  };

  const sevInfo = getSeverityLabel(severity);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {initialData ? 'Edit Episode Log' : 'Quick Episode Log'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Corneal erosion or symptom onset
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Voice-to-Log Quick Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                  : 'bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20'
              }`}
              title="Speak to log (Voice dictation)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Voice'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voice Feedback Banner */}
        {voiceNotice && (
          <div className="px-5 py-2 bg-teal-50 dark:bg-teal-950/60 border-b border-teal-500/20 text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between">
            <span className="truncate">{voiceNotice}</span>
            <button
              type="button"
              onClick={() => setVoiceNotice(null)}
              className="ml-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-sm">
          {/* Quick Presets for Rapid 5-Second Logging */}
          {!initialData && (
            <div className="p-3 rounded-2xl bg-teal-500/5 border border-teal-500/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>One-Tap Quick Presets:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('waking_erosion')}
                  className="px-2 py-2 rounded-xl text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-orange-400 dark:hover:border-orange-500 shadow-sm transition active:scale-95"
                >
                  <span className="block text-xs font-bold text-orange-600 dark:text-orange-400">🌅 Wake Tear</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Lvl 4 • Sharp pain</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('mild_gritty')}
                  className="px-2 py-2 rounded-xl text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-teal-400 dark:hover:border-teal-500 shadow-sm transition active:scale-95"
                >
                  <span className="block text-xs font-bold text-teal-600 dark:text-teal-400">🏖️ Sandy/Grit</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Lvl 2 • Scratchy</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('severe_tear')}
                  className="px-2 py-2 rounded-xl text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-rose-400 dark:hover:border-rose-500 shadow-sm transition active:scale-95"
                >
                  <span className="block text-xs font-bold text-rose-600 dark:text-rose-400">🏥 Emergency</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Lvl 5 • Debridement</span>
                </button>
              </div>
            </div>
          )}

          {/* 1. Affected Eye (Large Touch Targets for Blurry Vision) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Affected Eye <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'OS', label: 'Left Eye (OS)', sub: 'Left corneal flap' },
                  { id: 'OD', label: 'Right Eye (OD)', sub: 'Right corneal flap' },
                  { id: 'OU', label: 'Both Eyes (OU)', sub: 'Bilateral' },
                ] as const
              ).map((item) => {
                const isSelected = eye === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEye(item.id);
                      if (soundEnabled) sound.playGentleBeep(480, 0.05);
                    }}
                    className={`py-3 px-2 rounded-xl font-medium text-center border transition flex flex-col items-center justify-center min-h-[56px] active:scale-95 ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="text-sm font-bold">{item.label}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                      {item.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Severity Slider 1-5 with descriptive text */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Severity Level:
              </label>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${sevInfo.color}`}>
                {sevInfo.label}
              </span>
            </div>

            {/* Slider */}
            <div className="px-1 py-2">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={severity}
                onChange={(e) => {
                  setSeverity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5);
                  if (soundEnabled) sound.playGentleBeep(400 + Number(e.target.value) * 60, 0.05);
                }}
                className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-1 px-1">
                <span>1 Mild</span>
                <span>2 Grit</span>
                <span>3 Moderate</span>
                <span>4 Sharp Tear</span>
                <span>5 Severe</span>
              </div>
            </div>

            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 italic">
              {sevInfo.desc}
            </p>
          </div>

          {/* 3. Weather & Relative Humidity Correlation (Collapsed into single line by default) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <CloudSun className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {manualHumidity
                    ? `${manualHumidity}% humidity`
                    : weather
                    ? `${weather.humidity}% humidity`
                    : '32% humidity'}
                  {' · '}
                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                    {weather?.weatherDesc ||
                      (parseInt(manualHumidity || '32', 10) < 35 ? 'Dry' : 'Normal')}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshWeather}
                  disabled={isFetchingWeather}
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
                  title="Auto-detect local weather"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetchingWeather ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">
                    {isFetchingWeather ? 'Detecting...' : 'Auto'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWeatherExpanded(!isWeatherExpanded)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
                  title={isWeatherExpanded ? 'Collapse weather edit' : 'Edit humidity manually'}
                  aria-label="Edit weather manually"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Expanded manual weather inputs (only if edit icon tapped) */}
            {isWeatherExpanded && (
              <div className="pt-2.5 mt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-2 animate-in fade-in">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">
                        Humidity %
                      </span>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        placeholder="e.g. 35"
                        value={manualHumidity}
                        onChange={(e) => setManualHumidity(e.target.value)}
                        className="w-full font-bold text-slate-800 dark:text-white bg-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">
                        Condition
                      </span>
                      <span className="block font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {weather?.weatherDesc ||
                          (parseInt(manualHumidity, 10) < 35
                            ? 'Dry Air (Risk)'
                            : 'Normal Humidity')}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Low humidity (&lt;35%) directly accelerates tear evaporation and nocturnal lid-cornea friction.
                </p>
              </div>
            )}
          </div>

          {/* 4. Symptoms (Top 4 by default, + more symptoms expandable) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Symptoms Experienced
              </label>
              {!showMoreSymptoms && (
                <button
                  type="button"
                  onClick={() => setShowMoreSymptoms(true)}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  + more symptoms
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(showMoreSymptoms ? ALL_SYMPTOMS : ALL_SYMPTOMS.slice(0, 4)).map((sym) => {
                const isSelected = symptoms.includes(sym.id);
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => {
                      toggleSymptom(sym.id);
                      if (soundEnabled) sound.playGentleBeep(550, 0.04);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-left border transition text-xs font-medium active:scale-95 ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border-teal-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm">{sym.icon}</span>
                    <span className="flex-1 leading-snug">{sym.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {showMoreSymptoms && (
              <button
                type="button"
                onClick={() => setShowMoreSymptoms(false)}
                className="mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
              >
                Show fewer symptoms
              </button>
            )}
          </div>

          {/* 5. Photo Attachment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>Cornea / Redness Photo (Optional)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{photoUrl ? 'Replace Photo' : 'Take / Attach Photo'}</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {photoUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 flex items-center gap-3">
                <img
                  src={photoUrl}
                  alt="Episode cornea"
                  className="w-16 h-16 object-cover rounded-xl border border-slate-300 dark:border-slate-700"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-bold text-slate-800 dark:text-white block truncate">
                    Corneal Photo Attached
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Saved locally in IndexedDB & included in PDF report
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Remove photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-teal-500/50 rounded-2xl text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center gap-2 transition"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Tap to photograph eye redness or epithelial irregularity</span>
              </button>
            )}
          </div>

          {/* 6. Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Episode Date & Time</span>
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* 7. Combined Details Section: Trigger, Action Taken, Notes (Collapsed by default) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full py-3 px-4 flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-expanded={showDetails}
            >
              <div className="flex items-center gap-2">
                <span>Add details (Trigger, action taken, notes)</span>
                {Boolean(
                  (trigger && trigger !== 'Waking up / opening eyelid' && trigger !== 'Spontaneous / Unknown') ||
                  actionTaken ||
                  notes
                ) && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
              </div>
              <div className="flex items-center gap-1 text-slate-400 font-normal">
                <span>{showDetails ? 'Hide' : 'Expand'}</span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showDetails && (
              <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-in fade-in">
                {/* Trigger / Context */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Trigger / Context
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COMMON_TRIGGERS.map((t) => {
                      const isStandard = COMMON_TRIGGERS.slice(0, 6).includes(trigger);
                      const isSelected = t === 'Other / Custom' ? !isStandard : trigger === t;

                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            if (t === 'Other / Custom') {
                              if (isStandard) setTrigger('');
                            } else {
                              setTrigger(t);
                            }
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                            isSelected
                              ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold border-transparent'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>

                  {/* Only show free-text input when Other / Custom is selected */}
                  {(!COMMON_TRIGGERS.slice(0, 6).includes(trigger) || trigger === 'Other / Custom') && (
                    <input
                      type="text"
                      placeholder="Specify custom trigger (e.g. ceiling fan, sleep mask rubbing)..."
                      value={trigger === 'Other / Custom' ? '' : trigger}
                      onChange={(e) => setTrigger(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 animate-in fade-in"
                      autoFocus
                    />
                  )}
                </div>

                {/* Action Taken */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Action Taken (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Applied Muro 128 ointment, chilled tears, eye shield"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Personal Notes for Doctor (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any details on recovery time, visual blur, or doctor visits..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
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
              disabled={isSubmitting}
              className="flex-[2] py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold transition shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Check className="w-5 h-5" />
              <span>{initialData ? 'Update Episode' : 'Save Episode Log'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

