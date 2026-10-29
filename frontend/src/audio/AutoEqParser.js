/**
 * AutoEQ Headphone Preset Parser & RBJ Biquad Filter Engine
 * Reverse-engineered directly from Echo Music's ParametricEQParser.kt and BiquadFilter.kt:
 * - Parses standard AutoEQ text format: "Preamp: -X dB", "Filter N: ON/OFF PK/LSC/HSC Fc ... Gain ... Q ..."
 * - Robert Bristow-Johnson (RBJ) audio cookbook biquad filter math
 * - Full complex frequency response evaluation: H(e^{j*omega})
 * - Projection engine mapping parametric EQ curves onto 10-band graphic equalizers
 */

/**
 * DJ Automix Bass-Swap Ducking Formula
 * Reverse-engineered from Echo Music's AutomixDuckAudioProcessor.kt & MusicService.kt:
 * Over crossfade progress t in [0, 1]:
 * - Outgoing track bass (150 Hz low-shelf): flat 0 dB until t = 0.45, ducked progressively
 *   down to -18 dB by t = 0.85, remains at -18 dB through 1.0.
 * - Incoming track bass (150 Hz low-shelf): ducked initially at -18 dB through t = 0.55,
 *   brought progressively up from -18 dB to 0 dB by t = 1.0.
 * Eliminates acoustic bass clashing/mud during DJ crossfades.
 */
export function calculateBassSwapDucking(t) {
  const progress = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));

  let outDuckDb = 0;
  if (progress <= 0.45) {
    outDuckDb = 0;
  } else if (progress >= 0.85) {
    outDuckDb = -18;
  } else {
    const norm = Math.sin(((progress - 0.45) / (0.85 - 0.45)) * (Math.PI / 2));
    outDuckDb = -18 * norm;
  }

  let inDuckDb = -18;
  if (progress <= 0.55) {
    inDuckDb = -18;
  } else if (progress >= 1.0) {
    inDuckDb = 0;
  } else {
    const norm = Math.sin(((progress - 0.55) / (1.0 - 0.55)) * (Math.PI / 2));
    inDuckDb = -18 * (1 - norm);
  }

  return { outDuckDb, inDuckDb };
}

export const FilterType = Object.freeze({
  PK: 'PK',   // Peaking filter
  LSC: 'LSC', // Low Shelf
  HSC: 'HSC', // High Shelf
  LPQ: 'LPQ', // Low Pass (Q-resonant)
  HPQ: 'HPQ'  // High Pass (Q-resonant)
});

/**
 * Robert Bristow-Johnson (RBJ) Biquad IIR Filter
 */
export class BiquadFilter {
  constructor(sampleRate = 44100, frequency = 1000, gain = 0, q = 1.41, filterType = FilterType.PK) {
    this.sampleRate = sampleRate >= 22 ? sampleRate : 44100;
    this.frequency = frequency;
    this.gain = gain;
    this.q = q > 0 ? q : 1.41;
    this.filterType = filterType;

    this.b0 = 1.0;
    this.b1 = 0.0;
    this.b2 = 0.0;
    this.a0 = 1.0;
    this.a1 = 0.0;
    this.a2 = 0.0;

    // Delay registers for stereo audio processing
    this.x1L = 0.0;
    this.x2L = 0.0;
    this.y1L = 0.0;
    this.y2L = 0.0;

    this.x1R = 0.0;
    this.x2R = 0.0;
    this.y1R = 0.0;
    this.y2R = 0.0;

    this.calculateCoefficients();
  }

  calculateCoefficients() {
    switch (this.filterType) {
      case FilterType.PK:
        this.calculatePeakingCoefficients();
        break;
      case FilterType.LSC:
        this.calculateLowShelfCoefficients();
        break;
      case FilterType.HSC:
        this.calculateHighShelfCoefficients();
        break;
      case FilterType.LPQ:
        this.calculateLowPassCoefficients();
        break;
      case FilterType.HPQ:
        this.calculateHighPassCoefficients();
        break;
      default:
        this.calculatePeakingCoefficients();
        break;
    }
  }

  calculatePeakingCoefficients() {
    const safeFs = this.sampleRate;
    const safeFc = Math.max(10, Math.min(this.frequency, (safeFs / 2) - 1));
    const safeQ = this.q > 0 ? this.q : 1.41;

    const A = Math.pow(10, this.gain / 40.0);
    const omega = 2.0 * Math.PI * safeFc / safeFs;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2.0 * safeQ);

    this.b0 = 1.0 + alpha * A;
    this.b1 = -2.0 * cosOmega;
    this.b2 = 1.0 - alpha * A;
    this.a0 = 1.0 + alpha / A;
    this.a1 = -2.0 * cosOmega;
    this.a2 = 1.0 - alpha / A;

    this.normalize();
  }

  calculateLowShelfCoefficients() {
    const safeFs = this.sampleRate;
    const safeFc = Math.max(10, Math.min(this.frequency, (safeFs / 2) - 1));

    const A = Math.sqrt(Math.pow(10, this.gain / 20.0));
    const omega = 2.0 * Math.PI * safeFc / safeFs;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const S = 1.0; // Shelf slope
    const alpha = (sinOmega / 2.0) * Math.sqrt((A + 1.0 / A) * (1.0 / S - 1.0) + 2.0);
    const sqrtA = Math.sqrt(A);

    const aPlusOne = A + 1.0;
    const aMinusOne = A - 1.0;
    const twoSqrtAAlpha = 2.0 * sqrtA * alpha;

    this.b0 = A * (aPlusOne - aMinusOne * cosOmega + twoSqrtAAlpha);
    this.b1 = 2.0 * A * (aMinusOne - aPlusOne * cosOmega);
    this.b2 = A * (aPlusOne - aMinusOne * cosOmega - twoSqrtAAlpha);
    this.a0 = aPlusOne + aMinusOne * cosOmega + twoSqrtAAlpha;
    this.a1 = -2.0 * (aMinusOne + aPlusOne * cosOmega);
    this.a2 = aPlusOne + aMinusOne * cosOmega - twoSqrtAAlpha;

    this.normalize();
  }

  calculateHighShelfCoefficients() {
    const safeFs = this.sampleRate;
    const safeFc = Math.max(10, Math.min(this.frequency, (safeFs / 2) - 1));

    const A = Math.sqrt(Math.pow(10, this.gain / 20.0));
    const omega = 2.0 * Math.PI * safeFc / safeFs;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const S = 1.0;
    const alpha = (sinOmega / 2.0) * Math.sqrt((A + 1.0 / A) * (1.0 / S - 1.0) + 2.0);
    const sqrtA = Math.sqrt(A);

    const aPlusOne = A + 1.0;
    const aMinusOne = A - 1.0;
    const twoSqrtAAlpha = 2.0 * sqrtA * alpha;

    this.b0 = A * (aPlusOne + aMinusOne * cosOmega + twoSqrtAAlpha);
    this.b1 = -2.0 * A * (aMinusOne + aPlusOne * cosOmega);
    this.b2 = A * (aPlusOne - aMinusOne * cosOmega - twoSqrtAAlpha);
    this.a0 = aPlusOne - aMinusOne * cosOmega + twoSqrtAAlpha;
    this.a1 = 2.0 * (aMinusOne - aPlusOne * cosOmega);
    this.a2 = aPlusOne - aMinusOne * cosOmega - twoSqrtAAlpha;

    this.normalize();
  }

  calculateLowPassCoefficients() {
    const safeFs = this.sampleRate;
    const safeFc = Math.max(10, Math.min(this.frequency, (safeFs / 2) - 1));
    const safeQ = this.q > 0 ? this.q : 0.707;

    const omega = 2.0 * Math.PI * safeFc / safeFs;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2.0 * safeQ);

    this.b0 = (1.0 - cosOmega) / 2.0;
    this.b1 = 1.0 - cosOmega;
    this.b2 = (1.0 - cosOmega) / 2.0;
    this.a0 = 1.0 + alpha;
    this.a1 = -2.0 * cosOmega;
    this.a2 = 1.0 - alpha;

    this.normalize();
  }

  calculateHighPassCoefficients() {
    const safeFs = this.sampleRate;
    const safeFc = Math.max(10, Math.min(this.frequency, (safeFs / 2) - 1));
    const safeQ = this.q > 0 ? this.q : 0.707;

    const omega = 2.0 * Math.PI * safeFc / safeFs;
    const sinOmega = Math.sin(omega);
    const cosOmega = Math.cos(omega);
    const alpha = sinOmega / (2.0 * safeQ);

    this.b0 = (1.0 + cosOmega) / 2.0;
    this.b1 = -(1.0 + cosOmega);
    this.b2 = (1.0 + cosOmega) / 2.0;
    this.a0 = 1.0 + alpha;
    this.a1 = -2.0 * cosOmega;
    this.a2 = 1.0 - alpha;

    this.normalize();
  }

  normalize() {
    if (this.a0 !== 0.0) {
      this.b0 /= this.a0;
      this.b1 /= this.a0;
      this.b2 /= this.a0;
      this.a1 /= this.a0;
      this.a2 /= this.a0;
      this.a0 = 1.0;
    }
  }

  getCoefficients() {
    return {
      b0: this.b0,
      b1: this.b1,
      b2: this.b2,
      a1: this.a1,
      a2: this.a2
    };
  }

  /**
   * Frequency response magnitude at frequency f (Hz)
   * Evaluates H(e^{j*omega}) = (b0 + b1*z^-1 + b2*z^-2) / (1 + a1*z^-1 + a2*z^-2)
   */
  magnitudeResponse(targetFreq) {
    const omega = 2.0 * Math.PI * targetFreq / this.sampleRate;
    const cosW = Math.cos(omega);
    const sinW = Math.sin(omega);
    const cos2W = Math.cos(2 * omega);
    const sin2W = Math.sin(2 * omega);

    const numRe = this.b0 + this.b1 * cosW + this.b2 * cos2W;
    const numIm = -(this.b1 * sinW + this.b2 * sin2W);

    const denRe = 1.0 + this.a1 * cosW + this.a2 * cos2W;
    const denIm = -(this.a1 * sinW + this.a2 * sin2W);

    const numSq = numRe * numRe + numIm * numIm;
    const denSq = denRe * denRe + denIm * denIm;

    if (denSq === 0) return 1.0;
    return Math.sqrt(numSq / denSq);
  }

  /**
   * Frequency response in dB at frequency targetFreq
   */
  dbResponse(targetFreq) {
    const mag = this.magnitudeResponse(targetFreq);
    if (mag <= 0.000001) return -100;
    return 20.0 * Math.log10(mag);
  }

  processSample(input) {
    const output = this.b0 * input + this.b1 * this.x1L + this.b2 * this.x2L - this.a1 * this.y1L - this.a2 * this.y2L;
    this.x2L = this.x1L;
    this.x1L = input;
    this.y2L = this.y1L;
    this.y1L = output;
    return output;
  }

  processStereo(inL, inR) {
    const outL = this.b0 * inL + this.b1 * this.x1L + this.b2 * this.x2L - this.a1 * this.y1L - this.a2 * this.y2L;
    this.x2L = this.x1L;
    this.x1L = inL;
    this.y2L = this.y1L;
    this.y1L = outL;

    const outR = this.b0 * inR + this.b1 * this.x1R + this.b2 * this.x2R - this.a1 * this.y1R - this.a2 * this.y2R;
    this.x2R = this.x1R;
    this.x1R = inR;
    this.y2R = this.y1R;
    this.y1R = outR;

    return [outL, outR];
  }
}

/**
 * AutoEQ / Parametric EQ Parser
 */
export const AutoEqParser = {
  MAX_BANDS: 32,

  /**
   * Parses AutoEQ text block into structured profile:
   * {
   *   preamp: -6.5,
   *   bands: [{ filterType: 'PK', frequency: 31, gain: 5.2, q: 1.41, enabled: true }],
   *   metadata: { ... }
   * }
   */
  parseText(content) {
    if (!content || typeof content !== 'string') {
      return { preamp: 0.0, bands: [], metadata: {} };
    }

    const lines = content.split(/\r?\n/);
    let preamp = 0.0;
    const bands = [];
    const metadata = {};

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (/^Preamp:\s*/i.test(line)) {
        preamp = this.parsePreamp(line);
      } else if (/^Filter\s+\d+:\s*/i.test(line) || /^Filter\s*:/i.test(line)) {
        const band = this.parseFilterLine(line);
        if (band) {
          bands.push(band);
        }
      } else {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim();
          if (key && val) {
            metadata[key] = val;
          }
        }
      }
    }

    return { preamp, bands, metadata };
  },

  parsePreamp(line) {
    const match = line.match(/Preamp:\s*([-+]?\d+\.?\d*)\s*dB/i);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      return Number.isFinite(val) ? val : 0.0;
    }
    return 0.0;
  },

  parseFilterLine(line) {
    try {
      // Ignore disabled filters (OFF)
      if (/\bOFF\b/i.test(line) && !/\bON\b/i.test(line)) {
        return null;
      }

      // If neither ON nor OFF is explicitly present, assume ON if valid filter keywords exist
      const hasOn = /\bON\b/i.test(line);
      const filterType = this.parseFilterType(line);
      if (!filterType) return null;

      const frequency = this.parseValue(line, 'Fc', 'Hz');
      const gain = this.parseValue(line, 'Gain', 'dB');
      const q = this.parseValue(line, 'Q', null);

      if (frequency === null || gain === null || q === null) {
        return null;
      }

      return {
        filterType,
        frequency,
        gain,
        q,
        enabled: hasOn || true
      };
    } catch {
      return null;
    }
  },

  parseFilterType(line) {
    if (/\bLSC\b/i.test(line) || /\bLOW_SHELF\b/i.test(line)) return FilterType.LSC;
    if (/\bHSC\b/i.test(line) || /\bHIGH_SHELF\b/i.test(line)) return FilterType.HSC;
    if (/\bPK\b/i.test(line) || /\bPEAK\b/i.test(line) || /\bPEAKING\b/i.test(line)) return FilterType.PK;
    if (/\bLPQ\b/i.test(line) || /\bLOW_PASS\b/i.test(line)) return FilterType.LPQ;
    if (/\bHPQ\b/i.test(line) || /\bHIGH_PASS\b/i.test(line)) return FilterType.HPQ;
    return null;
  },

  parseValue(line, keyword, unit) {
    const unitPattern = unit ? `(?:\\s*${unit})?` : '';
    const regex = new RegExp(`\\b${keyword}\\s+([-+]?\\d+\\.?\\d*)${unitPattern}`, 'i');
    const match = line.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      return Number.isFinite(val) ? val : null;
    }
    return null;
  },

  validate(eq) {
    const errors = [];
    if (!eq) {
      return ['Profile is empty or null'];
    }

    if (typeof eq.preamp === 'number' && (eq.preamp < -50.0 || eq.preamp > 50.0)) {
      errors.push(`Preamp value ${eq.preamp} dB is out of range (-50 to +50 dB)`);
    }

    if (!Array.isArray(eq.bands) || eq.bands.length === 0) {
      errors.push('EQ profile must have at least one band');
    } else if (eq.bands.length > this.MAX_BANDS) {
      errors.push(`EQ profile has ${eq.bands.length} bands, maximum is ${this.MAX_BANDS}`);
    } else {
      eq.bands.forEach((band, index) => {
        if (!band || typeof band.frequency !== 'number' || band.frequency <= 0 || band.frequency > 100000) {
          errors.push(`Band ${index + 1}: Frequency ${band?.frequency} Hz is out of range (1 to 100000 Hz)`);
        }
        if (typeof band?.gain !== 'number' || band.gain < -30.0 || band.gain > 30.0) {
          errors.push(`Band ${index + 1}: Gain ${band?.gain} dB is out of range (-30 to +30 dB)`);
        }
        if (typeof band?.q !== 'number' || band.q <= 0.0 || band.q > 20.0) {
          errors.push(`Band ${index + 1}: Q factor ${band?.q} is out of range (0.01 to 20)`);
        }
      });
    }

    return errors;
  },

  toString(eq) {
    if (!eq) return '';
    const lines = [];
    lines.push(`Preamp: ${(eq.preamp || 0).toFixed(1)} dB`);
    if (Array.isArray(eq.bands)) {
      eq.bands.forEach((band, idx) => {
        lines.push(
          `Filter ${idx + 1}: ON ${band.filterType} Fc ${Math.round(band.frequency)} Hz Gain ${band.gain.toFixed(1)} dB Q ${band.q.toFixed(2)}`
        );
      });
    }
    return lines.join('\n');
  },

  toFileFormat(eq) {
    return this.toString(eq);
  },

  /**
   * Projects any ParametricEQ profile onto target fixed frequencies (e.g. 10-band ISO octave standard)
   * Using RBJ Biquad frequency response math:
   * H_total(f) = sum_i( H_i(f) )
   * Returns array of dB gains corresponding to targetFrequencies.
   */
  projectToFrequencies(
    eq,
    targetFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
    sampleRate = 44100
  ) {
    if (!eq || !Array.isArray(eq.bands) || eq.bands.length === 0) {
      return targetFrequencies.map(() => 0.0);
    }

    // Instantiate RBJ biquad filters for each active band
    const biquadList = eq.bands
      .filter((band) => band && band.enabled !== false)
      .map((band) => new BiquadFilter(sampleRate, band.frequency, band.gain, band.q, band.filterType));

    return targetFrequencies.map((f) => {
      let totalDb = 0.0;
      for (const filter of biquadList) {
        totalDb += filter.dbResponse(f);
      }
      // Clamp to practical equalizer range (-15dB to +15dB)
      const clamped = Math.max(-15.0, Math.min(15.0, totalDb));
      return Number(clamped.toFixed(2));
    });
  }
};

/**
 * Applies an AutoEQ profile or text to Dropify's AudioManager 10-band EQ
 */
export function applyAutoEqToAudioManager(audioManager, autoEqInput, sampleRate = 44100) {
  if (!audioManager) {
    return { success: false, error: 'AudioManager instance is required' };
  }

  let profile = autoEqInput;
  if (typeof autoEqInput === 'string') {
    profile = AutoEqParser.parseText(autoEqInput);
  }

  const errors = AutoEqParser.validate(profile);
  if (errors.length > 0) {
    return { success: false, errors };
  }

  const targetFrequencies = audioManager.eqFrequencies || [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const projectedGains = AutoEqParser.projectToFrequencies(profile, targetFrequencies, sampleRate);

  // Apply to AudioManager bands
  projectedGains.forEach((gainDb, index) => {
    if (typeof audioManager.setEqualizerBand === 'function') {
      audioManager.setEqualizerBand(index, gainDb);
    }
  });

  return {
    success: true,
    profile,
    projectedGains,
    preamp: profile.preamp || 0.0,
    bandsCount: profile.bands.length
  };
}

export const projectTo10Band = (eq, sampleRate = 44100) =>
  AutoEqParser.projectToFrequencies(eq, [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000], sampleRate);

export default AutoEqParser;
