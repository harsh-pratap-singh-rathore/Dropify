import React, { useState } from 'react';
import { Play, Pause, Heart, Shuffle, Compass, BookOpen, Disc, Check, Sparkles, User, Flame, ArrowUpRight } from 'lucide-react';

export default function RemappedHomeShowcase() {
  const [isPlayingVinyl, setIsPlayingVinyl] = useState(true);
  const [selectedStation, setSelectedStation] = useState('liked');
  const [selectedArtist, setSelectedArtist] = useState('AUR');

  const artists = [
    { name: 'AUR', genre: 'Indie Pop', songs: '14 Tracks', verified: true, color: '#FF2D55' },
    { name: 'Arijit Singh', genre: 'Acoustic Soul', songs: '86 Tracks', verified: true, color: '#00C2FF' },
    { name: 'Coldplay', genre: 'Alt Rock', songs: '52 Tracks', verified: true, color: '#FFE500' },
    { name: 'Diljit Dosanjh', genre: 'Punjabi Wave', songs: '38 Tracks', verified: true, color: '#10B981' },
    { name: 'The Weeknd', genre: 'Synthwave', songs: '64 Tracks', verified: true, color: '#FF2E63' }
  ];

  const topCharts = [
    { rank: '01', title: 'Tu Hai Kahan', artist: 'AUR', plays: '2.4M', duration: '4:12' },
    { rank: '02', title: 'Yellow (Acoustic)', artist: 'Coldplay', plays: '1.9M', duration: '4:29' },
    { rank: '03', title: 'O Maahi', artist: 'Arijit Singh', plays: '1.7M', duration: '3:53' },
    { rank: '04', title: 'Hass Hass', artist: 'Diljit Dosanjh', plays: '1.5M', duration: '3:15' },
    { rank: '05', title: 'Blinding Lights', artist: 'The Weeknd', plays: '3.1M', duration: '3:20' }
  ];

  return (
    <section className="landing-section section-canvas-alt remapped-home-section" id="remapped-home">
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header">
          <div className="section-tag pink">Architecture Upgrade</div>
          <h2 className="section-title">The Remapped Home Screen.</h2>
          <p className="section-subtitle">
            Zero clutter. Zero delays. Dropify v2.0.3.1 completely restructures the Home hierarchy around instant tactile stations, physical vinyl showcases, and dedicated artist hubs.
          </p>
        </div>

        {/* Remapped Interactive Grid Showcase */}
        <div className="remapped-stage-container neo-card">
          <div className="washi-tape yellow"></div>

          <div className="remapped-header-bar">
            <div className="remapped-badge-row">
              <span className="live-pulse-dot"></span>
              <span className="remapped-badge-title">INTERACTIVE HOME DEMO // V2.0.3.1</span>
            </div>
            <div className="remapped-version-pill">
              <span>Pure 2D Neobrutalism</span>
            </div>
          </div>

          <div className="remapped-columns-grid">
            {/* Left Column: 2x3 Bento Quick-Play Stations Grid */}
            <div className="remapped-col-left">
              <div className="bento-col-header">
                <div className="bento-col-tag">QUICK-PLAY STATION GRID</div>
                <h3 className="bento-col-title">Start listening in one tactile tap.</h3>
                <p className="bento-col-desc">
                  Six high-density stations automatically adapt to your listening routine. Tap any tile to test station selection:
                </p>
              </div>

              <div className="bento-stations-grid">
                {/* Station 1: Liked Songs */}
                <div
                  className={`bento-station-card ${selectedStation === 'liked' ? 'active' : ''}`}
                  onClick={() => setSelectedStation('liked')}
                >
                  <div className="bento-icon-box bento-icon-crimson">
                    <Heart size={18} fill="#FF2D55" color="#FF2D55" />
                  </div>
                  <div className="bento-station-info">
                    <span className="bento-station-name">Liked Songs</span>
                    <span className="bento-station-meta">42 Loved Tracks</span>
                  </div>
                  <span className="bento-station-badge">Vault</span>
                </div>

                {/* Station 2: Circadian Daily Mix */}
                <div
                  className={`bento-station-card ${selectedStation === 'circadian' ? 'active' : ''}`}
                  onClick={() => setSelectedStation('circadian')}
                >
                  <div className="bento-icon-box bento-icon-cyan">
                    <Compass size={18} color="#00C2FF" />
                  </div>
                  <div className="bento-station-info">
                    <span className="bento-station-name">Daily Vibe Mix</span>
                    <span className="bento-station-meta">Circadian Soundscape</span>
                  </div>
                  <span className="bento-station-badge">Live</span>
                </div>

                {/* Station 3: Instant 10-Track Shuffle */}
                <div
                  className={`bento-station-card ${selectedStation === 'shuffle' ? 'active' : ''}`}
                  onClick={() => setSelectedStation('shuffle')}
                >
                  <div className="bento-icon-box bento-icon-yellow">
                    <Shuffle size={18} color="#0E0E10" />
                  </div>
                  <div className="bento-station-info">
                    <span className="bento-station-name">Instant Shuffle</span>
                    <span className="bento-station-meta">10 Quick Surprises</span>
                  </div>
                  <span className="bento-station-badge">Fast</span>
                </div>

                {/* Station 4: Sound Notebooks */}
                <div
                  className={`bento-station-card ${selectedStation === 'notebooks' ? 'active' : ''}`}
                  onClick={() => setSelectedStation('notebooks')}
                >
                  <div className="bento-icon-box bento-icon-green">
                    <BookOpen size={18} color="#10B981" />
                  </div>
                  <div className="bento-station-info">
                    <span className="bento-station-name">Sound Notebooks</span>
                    <span className="bento-station-meta">Custom Playlists</span>
                  </div>
                  <span className="bento-station-badge">3 Lists</span>
                </div>

                {/* Station 5: Recent Station 1 */}
                <div
                  className={`bento-station-card ${selectedStation === 'station1' ? 'active' : ''}`}
                  onClick={() => setSelectedStation('station1')}
                >
                  <div className="bento-icon-box bento-icon-purple">
                    <Flame size={18} color="#FF5E62" />
                  </div>
                  <div className="bento-station-info">
                    <span className="bento-station-name">Midnight Beats</span>
                    <span className="bento-station-meta">Lo-Fi Instrumental</span>
                  </div>
                  <span className="bento-station-badge">Resume</span>
                </div>

                {/* Station 6: Recent Station 2 */}
                <div
                  className={`bento-station-card ${selectedStation === 'station2' ? 'active' : ''}`}
                  onClick={() => setSelectedStation('station2')}
                >
                  <div className="bento-icon-box bento-icon-teal">
                    <Disc size={18} color="#00E5FF" />
                  </div>
                  <div className="bento-station-info">
                    <span className="bento-station-name">Acoustic Sunset</span>
                    <span className="bento-station-meta">Warm Resonance</span>
                  </div>
                  <span className="bento-station-badge">Resume</span>
                </div>
              </div>

              {/* Spotlight Artists Row in Rotation */}
              <div className="spotlight-artists-container">
                <div className="spotlight-artists-header">
                  <span className="spotlight-title">ARTISTS IN HEAVY ROTATION</span>
                  <span className="spotlight-sub">Tap to inspect discography</span>
                </div>

                <div className="spotlight-artists-scroll">
                  {artists.map((art) => (
                    <button
                      key={art.name}
                      className={`spotlight-artist-pill ${selectedArtist === art.name ? 'active' : ''}`}
                      onClick={() => setSelectedArtist(art.name)}
                    >
                      <div className="artist-avatar-mini" style={{ borderColor: art.color }}>
                        <User size={14} color={art.color} />
                      </div>
                      <span className="artist-pill-name">{art.name}</span>
                      {art.verified && <Check size={12} color="#10B981" />}
                    </button>
                  ))}
                </div>

                <div className="artist-discography-preview-banner">
                  <div className="discography-badge-row">
                    <span className="discography-pill">PURE ARTIST ISOLATION</span>
                    <span className="discography-artist-name">{selectedArtist}</span>
                  </div>
                  <p className="discography-preview-text">
                    Dropify isolates {selectedArtist}'s authentic tracks from record label channels, enabling continuous listening with dedicated Play All, Shuffle, and Artist Radio.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Physical Vinyl Billboard Showcase */}
            <div className="remapped-col-right">
              <div className="vinyl-billboard-card">
                <div className="vinyl-billboard-top">
                  <span className="radar-spotlight-tag">RADAR SPOTLIGHT // TRACK OF THE DAY</span>
                  <button
                    className="vinyl-toggle-btn"
                    onClick={() => setIsPlayingVinyl(!isPlayingVinyl)}
                    title={isPlayingVinyl ? "Pause Rotation" : "Spin Record"}
                  >
                    {isPlayingVinyl ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isPlayingVinyl ? "STOP DISC" : "SPIN DISC"}</span>
                  </button>
                </div>

                {/* Physical Vinyl Turntable Disc Presentation */}
                <div className="vinyl-record-stage">
                  <div className={`vinyl-disc-assembly ${isPlayingVinyl ? 'is-spinning' : ''}`}>
                    <div className="vinyl-outer-groove"></div>
                    <div className="vinyl-groove-ring ring-1"></div>
                    <div className="vinyl-groove-ring ring-2"></div>
                    <div className="vinyl-groove-ring ring-3"></div>
                    <div className="vinyl-center-label">
                      <div className="vinyl-spindle-hole"></div>
                      <span className="vinyl-label-text">DROPIFY</span>
                      <span className="vinyl-label-rpm">33⅓ RPM</span>
                    </div>
                  </div>

                  {/* Stylus Tone Arm */}
                  <div className={`vinyl-stylus-arm ${isPlayingVinyl ? 'arm-on-record' : ''}`}>
                    <div className="stylus-pivot"></div>
                    <div className="stylus-rod"></div>
                    <div className="stylus-cartridge"></div>
                  </div>
                </div>

                {/* Track Metadata and Quick Action */}
                <div className="vinyl-meta-details">
                  <div className="vinyl-title-row">
                    <div>
                      <h4 className="vinyl-song-title">Tu Hai Kahan</h4>
                      <p className="vinyl-song-artist">AUR • Single (2024)</p>
                    </div>
                    <span className="vinyl-genre-badge">#indie-pop</span>
                  </div>

                  {/* Billboard Top 5 Chart Shelf */}
                  <div className="billboard-top5-shelf">
                    <div className="shelf-header">
                      <span className="shelf-title">BILLBOARD TOP 5 CHART</span>
                      <span className="shelf-metric">Top Plays</span>
                    </div>

                    <div className="shelf-track-list">
                      {topCharts.map((t) => (
                        <div key={t.rank} className="shelf-track-row">
                          <span className="shelf-rank-num">{t.rank}</span>
                          <div className="shelf-track-info">
                            <span className="shelf-track-title">{t.title}</span>
                            <span className="shelf-track-artist">{t.artist}</span>
                          </div>
                          <span className="shelf-track-plays">{t.plays}</span>
                          <span className="shelf-track-time">{t.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
