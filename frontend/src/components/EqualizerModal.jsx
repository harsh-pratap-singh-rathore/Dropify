import React from 'react';
import { X, Sliders, Activity, Disc, Radio } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [5, 4.5, 3.5, 2, 0, 0, 0, 1, 2, 2.5],
  'Vocal Clarity': [-2, -1, 0, 1.5, 3, 3.5, 3, 2, 1, 0],
  Electronic: [4.5, 4, 2, 0, -1, 1, 2, 3, 4, 4.5],
  Rock: [4, 3, 1.5, 0, -1, 0.5, 1.5, 2.5, 3.5, 4],
  Audiophile: [1.5, 1, 0.5, 0, 0, 0, 0.5, 1, 1.5, 2]
};

const FREQ_LABELS = ['32Hz', '64Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

export default function EqualizerModal() {
  const {
    isEqOpen,
    setIsEqOpen,
    isEqualizerEnabled,
    setIsEqualizerEnabled,
    eqGains,
    updateEqGain,
    stereoWidth,
    updateStereoWidth,
    crossfadeDuration,
    setCrossfadeDuration
  } = usePlayer();

  if (!isEqOpen) return null;

  const handleApplyPreset = (presetName) => {
    const gains = PRESETS[presetName];
    if (gains) {
      gains.forEach((val, idx) => updateEqGain(idx, val));
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsEqOpen(false)}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sliders size={20} className="icon-glow" />
            <span>Parametric Equalizer & Audio DSP</span>
          </div>
          <button className="btn-icon" onClick={() => setIsEqOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Master Toggle & Presets */}
        <div className="eq-top-bar">
          <div className="toggle-row">
            <span className="label-bold">DSP Status:</span>
            <button
              className={`glass-pill ${isEqualizerEnabled ? 'active' : ''}`}
              onClick={() => setIsEqualizerEnabled(!isEqualizerEnabled)}
            >
              {isEqualizerEnabled ? 'Active (Biquad Enabled)' : 'Bypassed'}
            </button>
          </div>

          <div className="presets-list">
            {Object.keys(PRESETS).map((pName) => (
              <button
                key={pName}
                className="glass-pill preset-btn"
                onClick={() => handleApplyPreset(pName)}
              >
                {pName}
              </button>
            ))}
          </div>
        </div>

        {/* 10-Band EQ Sliders */}
        <div className="eq-bands-grid">
          {eqGains.map((gain, index) => (
            <div key={FREQ_LABELS[index]} className="eq-slider-col">
              <span className="gain-val">{gain > 0 ? `+${gain}` : gain}dB</span>
              <div className="vertical-slider-wrapper">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={gain}
                  onChange={(e) => updateEqGain(index, parseFloat(e.target.value))}
                  className="vertical-slider"
                />
              </div>
              <span className="freq-label">{FREQ_LABELS[index]}</span>
            </div>
          ))}
        </div>

        {/* Advanced Audio Extensions: Stereo Widener & Equal-Power Crossfade */}
        <div className="dsp-advanced-row">
          <div className="dsp-card glass-card">
            <div className="dsp-card-title">
              <Activity size={18} />
              <span>Mid/Side Stereo Widener</span>
            </div>
            <div className="dsp-card-control">
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={stereoWidth}
                onChange={(e) => updateStereoWidth(parseFloat(e.target.value))}
                className="wide-slider"
              />
              <span className="control-val">{stereoWidth.toFixed(2)}x Width</span>
            </div>
            <span className="control-hint">Expands acoustic soundstage via Mid/Side matrixing</span>
          </div>

          <div className="dsp-card glass-card">
            <div className="dsp-card-title">
              <Disc size={18} />
              <span>Equal-Power Crossfade</span>
            </div>
            <div className="dsp-card-control">
              <input
                type="range"
                min="0"
                max="8"
                step="0.5"
                value={crossfadeDuration}
                onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
                className="wide-slider"
              />
              <span className="control-val">{crossfadeDuration}s</span>
            </div>
            <span className="control-hint">Sine/Cosine constant acoustic power curve</span>
          </div>
        </div>
      </div>
    </div>
  );
}
