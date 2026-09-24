/**
 * Web Speech API helper for voice-logging EBMD episodes
 * Listens to speech, transcribes, and extracts key clinical parameters:
 * Severity (1-5), Eye (OD, OS, OU), Symptoms, and Triggers.
 */

import { EyeTarget, SymptomType } from '../types/ebmd';

export interface ParsedVoiceLog {
  transcript: string;
  severity?: number;
  eye?: EyeTarget;
  symptoms: SymptomType[];
  trigger?: string;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function createSpeechRecognizer(
  onResult: (text: string, isFinal: boolean) => void,
  onError: (err: string) => void,
  onEnd: () => void
): { start: () => void; stop: () => void } | null {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    if (final) {
      onResult(final.trim(), true);
    } else if (interim) {
      onResult(interim.trim(), false);
    }
  };

  recognition.onerror = (event: any) => {
    onError(event.error || 'Speech recognition error');
  };

  recognition.onend = () => {
    onEnd();
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Parses spoken speech text into structured EBMD episode values
 */
export function parseVoiceTranscript(text: string): ParsedVoiceLog {
  const lower = text.toLowerCase();
  const result: ParsedVoiceLog = {
    transcript: text,
    symptoms: [],
  };

  // 1. Detect Eye Target
  if (lower.includes('left eye') || lower.includes('o s') || lower.includes('left')) {
    result.eye = 'OS';
  } else if (lower.includes('right eye') || lower.includes('o d') || lower.includes('right')) {
    result.eye = 'OD';
  } else if (lower.includes('both eyes') || lower.includes('both') || lower.includes('o u')) {
    result.eye = 'OU';
  }

  // 2. Detect Severity (1 to 5)
  if (lower.includes('level 5') || lower.includes('severity 5') || lower.includes('emergency') || lower.includes('excruciating')) {
    result.severity = 5;
  } else if (lower.includes('level 4') || lower.includes('severity 4') || lower.includes('severe') || lower.includes('intense')) {
    result.severity = 4;
  } else if (lower.includes('level 3') || lower.includes('severity 3') || lower.includes('moderate pain')) {
    result.severity = 3;
  } else if (lower.includes('level 2') || lower.includes('severity 2') || lower.includes('discomfort') || lower.includes('mild')) {
    result.severity = 2;
  } else if (lower.includes('level 1') || lower.includes('severity 1') || lower.includes('barely') || lower.includes('slight')) {
    result.severity = 1;
  } else {
    // Check raw digit
    const matchDigit = lower.match(/\b([1-5])\b/);
    if (matchDigit) {
      result.severity = parseInt(matchDigit[1], 10);
    }
  }

  // 3. Detect Symptoms
  if (lower.includes('wake') || lower.includes('waking') || lower.includes('morning tear') || lower.includes('opening eye')) {
    result.symptoms.push('sharp_waking_tear');
    if (!result.trigger) result.trigger = 'Waking opening';
  }

  if (lower.includes('pain') || lower.includes('hurts') || lower.includes('stinging') || lower.includes('burning')) {
    result.symptoms.push('pain');
  }

  if (lower.includes('grit') || lower.includes('gritty') || lower.includes('sand') || lower.includes('sandy')) {
    result.symptoms.push('gritty_sandy');
  }

  if (lower.includes('blur') || lower.includes('blurry') || lower.includes('fuzzy') || lower.includes('dim')) {
    result.symptoms.push('blurry_vision');
  }

  if (lower.includes('foreign') || lower.includes('eyelash') || lower.includes('scratch') || lower.includes('something in')) {
    result.symptoms.push('foreign_body');
  }

  if (lower.includes('light') || lower.includes('photophobia') || lower.includes('bright')) {
    result.symptoms.push('photophobia');
  }

  if (lower.includes('tear') || lower.includes('watering') || lower.includes('watery')) {
    result.symptoms.push('excessive_tearing');
  }

  if (lower.includes('hospital') || lower.includes('clinic') || lower.includes('er') || lower.includes('debridement') || lower.includes('bcl')) {
    result.symptoms.push('hospital_debridement');
    if (result.severity === undefined || result.severity < 4) {
      result.severity = 5;
    }
  }

  // Deduplicate symptoms
  result.symptoms = Array.from(new Set(result.symptoms));

  // Default symptoms if none matched but speech happened
  if (result.symptoms.length === 0) {
    result.symptoms.push('pain');
  }

  return result;
}
