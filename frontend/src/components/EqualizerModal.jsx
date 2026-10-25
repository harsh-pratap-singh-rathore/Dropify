import React, { useMemo } from 'react';
import { X, Sliders, Activity, Disc, RotateCcw, Volume2, Sparkles } from 'lucide-react';
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

  // Detect current active preset
  const activePreset = useMemo(() => {
    for (const [name, presetGains] of Object.entries(PRESETS)) {
      if (presetGains.every((g, i) => Math.abs(g - (eqGains[i] || 0)) < 0.1)) {
        return name;
      }
    }
    return 'Custom';
  }, [eqGains]);

  // Generate SVG Bézier curve points for dynamic DSP response curve
  const { curvePath, areaPath, nodePoints } = useMemo(() => {
    const W = 520;
    const H = 100;
    const padX = 26;
    const usableW = W - padX * 2;
    const stepX = usableW / (FREQ_LABELS.length - 1);
    const midY = H / 2; // 0 dB line

    const pts = (eqGains || []).map((gain, i) => {
      const x = padX + i * stepX;
      // -12dB to +12dB mapped to Y
      const clampedGain = Math.max(-12, Math.min(12, gain || 0));
      const y = midY - (clampedGain / 12) * (midY - 10);
      return { x, y, gain: clampedGain };
    });

    if (pts.length === 0) return { curvePath: '', areaPath: '', nodePoints: [] };

    // Build smooth cubic Bézier spline
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const area = `${path} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

    return { curvePath: path, areaPath: area, nodePoints: pts };
  }, [eqGains]);

  if (!isEqOpen) return null;

  const handleApplyPreset = (presetName) => {
    const gains = PRESETS[presetName];
    if (gains) {
      gains.forEach((val, idx) => updateEqGain(idx, val));
    }
  };

  const handleResetFlat = () => {
    handleApplyPreset('Flat');
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsEqOpen(false)}>
      <div className="modal-content eq-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="washi-tape-top" />
        
        <div className="modal-header">
          <div className="modal-title">
            <Sliders size={20} />
            <span className="sketch-font-title">10-Band Parametric DSP Engine</span>
          </div>
          <button className="btn-icon" onClick={() => setIsEqOpen(false)} aria-label="Close Equalizer">
            <X size={18} />
          </button>
        </div>

        {/* Master Toggle, Preset Chips & Reset */}
        <div className="eq-top-bar">
          <div className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="label-bold sketch-font-hand">DSP Status:</span>
              <button
                className={`sketch-btn ${isEqualizerEnabled ? 'sketch-btn-primary' : ''}`}
                style={{ padding: '4px 12px', fontSize: '0.9rem' }}
                onClick={() => setIsEqualizerEnabled(!isEqualizerEnabled)}
              >
                {isEqualizerEnabled ? 'Active (10-Band Biquad)' : 'Bypassed'}
              </button>
            </div>

            <button
              className="sketch-btn"
              style={{ padding: '4px 10px', fontSize: '0.85rem' }}
              onClick={handleResetFlat}
              title="Reset all bands to 0dB Flat"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>

          <div className="presets-list" style={{ marginTop: '4px' }}>
            {Object.keys(PRESETS).map((pName) => {
              const isActive = activePreset === pName;
              return (
                <button
                  key={pName}
                  className={`category-chip ${isActive ? 'active' : ''}`}
                  style={{ padding: '4px 12px', fontSize: '0.92rem' }}
                  onClick={() => handleApplyPreset(pName)}
                >
                  {pName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Interactive SVG Frequency Response Curve */}
        <div className="eq-graph-container" style={{ position: 'relative', width: '100%', height: '110px', background: '#ffffff', border: '2px solid var(--paper-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
          <svg
            viewBox="0 0 520 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <defs>
              <linearGradient id="eqDspGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF3366" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#FF9900" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#FFD600" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid Reference Lines (+12dB, 0dB, -12dB) */}
            <line x1="0" y1="14" x2="520" y2="14" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2="520" y2="50" stroke="#71717A" strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="0" y1="86" x2="520" y2="86" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />

            {/* Area Fill Under Curve */}
            {isEqualizerEnabled && (
              <path d={areaPath} fill="url(#eqDspGrad)" style={{ transition: 'all 0.12s ease' }} />
            )}

            {/* Glowing Frequency Response Spline */}
            <path
              d={curvePath}
              fill="none"
              stroke={isEqualizerEnabled ? '#FF3366' : '#A1A1AA'}
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ transition: 'all 0.12s ease' }}
            />

            {/* Node Points */}
            {nodePoints.map((node, i) => (
              <circle
                key={i}
                cx={node.x}
                cy={node.y}
                r={isEqualizerEnabled ? '4.5' : '3'}
                fill={isEqualizerEnabled ? '#FF3366' : '#71717A'}
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{ transition: 'all 0.12s ease' }}
              />
            ))}
          </svg>

          {/* Reference dB Legends */}
          <span style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#A1A1AA' }}>+12dB</span>
          <span style={{ position: 'absolute', top: '42px', left: '6px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#71717A', fontWeight: 700 }}>0dB</span>
          <span style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#A1A1AA' }}>-12dB</span>
        </div>

        {/* 10-Band EQ Touch-Scrollable Sliders Grid */}
        <div className="eq-bands-scroll-wrap">
          <div className="eq-bands-grid">
            {eqGains.map((gain, index) => {
              const gainFormatted = gain > 0 ? `+${gain}` : `${gain}`;
              return (
                <div key={FREQ_LABELS[index]} className="eq-slider-col">
                  <span className="gain-badge-compact">{gainFormatted}</span>
                  <div className="vertical-slider-wrap">
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.5"
                      value={gain}
                      disabled={!isEqualizerEnabled}
                      onChange={(e) => updateEqGain(index, parseFloat(e.target.value))}
                      className="eq-vertical-slider"
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                      aria-label={`${FREQ_LABELS[index]} gain`}
                    />
                  </div>
                  <span className="freq-label">{FREQ_LABELS[index]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advanced Acoustic Matrixing: Mid/Side Stereo Widener & Crossfade */}
        <div className="eq-addons-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div className="sketch-card" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontFamily: 'var(--font-hand)', fontSize: '1.05rem', fontWeight: 700 }}>
              <Activity size={16} />
              <span>Mid/Side Stereo Widener</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={stereoWidth}
                onChange={(e) => updateStereoWidth(parseFloat(e.target.value))}
                className="seek-slider"
                style={{ flex: 1 }}
              />
              <span className="sketch-font-mono" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{stereoWidth.toFixed(2)}x</span>
            </div>
            <span className="sketch-font-hand" style={{ fontSize: '0.8rem', color: 'var(--graphite-muted)' }}>Acoustic soundstage matrix</span>
          </div>

          <div className="sketch-card" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontFamily: 'var(--font-hand)', fontSize: '1.05rem', fontWeight: 700 }}>
              <Disc size={16} />
              <span>Crossfade Mix</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="8"
                step="0.5"
                value={crossfadeDuration}
                onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
                className="seek-slider"
                style={{ flex: 1 }}
              />
              <span className="sketch-font-mono" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{crossfadeDuration}s</span>
            </div>
            <span className="sketch-font-hand" style={{ fontSize: '0.8rem', color: 'var(--graphite-muted)' }}>Equal-power crossfade transition</span>
          </div>
        </div>
      </div>
    </div>
  );
}
