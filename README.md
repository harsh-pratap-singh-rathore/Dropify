# 🫧 Dropify — Next-Gen Audiophile Web Music Player

> Reverse-engineered from **Echo Music** with **REA** and **Ghidra**. Engineered with the **MERN** stack (React + Node/Express + Local JSON Store) and styled with **Nothing OS 5.0 Liquid Glass** aesthetics.

---

## 🌟 Overview & Architecture

Dropify translates the high-performance native audio pipeline and discovery mechanisms of **Echo Music** (Android Kotlin / C++) into a modern, ad-free, browser-native web platform.

```
                    ┌───────────────────────────────────────────────┐
                    │               DROPIFY WEB APP                 │
                    │         React 18 + Vite (Port 3000)           │
                    │        Nothing OS 5.0 "Liquid Glass"          │
                    └───────────────────────┬───────────────────────┘
                                            │
               ┌────────────────────────────┴───────────────────────────┐
               │                                                        │
               ▼                                                        ▼
┌───────────────────────────────┐                       ┌───────────────────────────────┐
│     WEB AUDIO API DSP CHAIN   │                       │      DROPIFY EXPRESS CORE     │
│   • 10-Band Parametric EQ     │                       │       Node.js (Port 5001)     │
│   • Mid/Side Stereo Widener   │                       │                               │
│   • Equal-Power Crossfader    │                       │  • InnerTube Streaming Engine │
│   • Real-Time FFT Analyser    │                       │  • LRCLIB Synced Lyrics       │
│   • Apple-Style Visualizer    │                       │  • Echo Brain Taste Engine    │
└───────────────────────────────┘                       │  • Local Storage Service      │
                                                        └───────────────┬───────────────┘
                                                                        │
                                            ┌───────────────────────────┴───────────────────────────┐
                                            │                                                       │
                                            ▼                                                       ▼
                             ┌─────────────────────────────┐                         ┌─────────────────────────────┐
                             │       YouTube Catalog       │                         │      Local JSON Storage     │
                             │ (Direct Audio Streams 206)  │                         │  • library.json             │
                             └─────────────────────────────┘                         │  • play_stats.json          │
                                                                                     │  • preferences.json         │
                                                                                     └─────────────────────────────┘
```

---

## 🚀 Key Features

### 1. 🎛️ Audiophile Web Audio DSP Pipeline
- **10-Band Parametric Equalizer**: Biquad IIR peaking filters centered at `32Hz`, `64Hz`, `125Hz`, `250Hz`, `500Hz`, `1kHz`, `2kHz`, `4kHz`, `8kHz`, and `16kHz` with $\pm 12\text{dB}$ gain adjustment and built-in presets (*Bass Boost*, *Vocal Sparkle*, *Acoustic*, *Electronic*, *Flat*).
- **Mid/Side Stereo Widener**: Splits stereo channels into Mid ($L+R$) and Side ($L-R$) components to expand the acoustic stage width without phase cancellation.
- **Equal-Power Crossfader**: Mathematical $\cos^2(\theta) + \sin^2(\theta) = 1.0$ transition curve preventing the volume dip common in linear crossfades.
- **Real-Time FFT Analyser**: 64-frequency-bin responsive visualizer rendering fluid glass frequency bars in the full-screen player.

### 2. 📜 Multi-Source Synced Lyrics
- Real-time LRC parser synchronizing timestamps `[mm:ss.xx]` down to milliseconds.
- Auto-scrolling, karaoke-style active line highlighting, and Apple Music-style blurred ambient background.

### 3. 🧠 Echo Brain — On-Device Taste Engine
- Ported from Echo Music's local recommendation model.
- Continuous learning formula:
  $$\text{Score} = \ln(1 + \text{durationMins}) \times 2.0 - (\text{skips} \times 3.0) + \text{liked}(+5.0) + \text{recencyBoost} \times \text{circadianMultiplier}$$
- Automatically curates time-of-day mixes (*Morning Focus*, *Afternoon Energy*, *Evening Unwind*, *Night Chill*).

### 4. 📱 "Music Flow" Vertical Discovery
- TikTok / Instagram Reels-style vertical swipeable feed for rapid song discovery.
- Instant 30-second preview auto-play with seamless queue injection.

### 5. 💎 Nothing OS 5.0 "Liquid Glass" Aesthetic
- Dark mode canvas (`#0b0c10`) with translucent frosted glass panels (`backdrop-filter: blur(40px)`).
- Glowing crimson accent (`#ed5564`) and typography inspired by Nothing OS and Apple Music.

---

## 🛠️ Project Structure

```
dropify/
├── backend/
│   ├── data/                   # Local persistent JSON database (no MongoDB required)
│   │   ├── library.json        # Liked tracks and custom playlists
│   │   ├── play_stats.json     # Echo Brain play counts, duration, and skip rates
│   │   └── preferences.json    # User audio preferences, EQ presets, volume
│   ├── services/
│   │   ├── innertubeService.js # YouTube Music catalog search, home feed, range audio streaming
│   │   ├── lyricsService.js    # LRCLIB synchronized lyrics resolver & timestamp parser
│   │   ├── storageService.js   # Local atomic JSON storage engine
│   │   └── tasteEngine.js      # On-device circadian taste scoring algorithm
│   ├── package.json
│   └── server.js               # Express API gateway (Port 5001)
│
└── frontend/
    ├── src/
    │   ├── audio/
    │   │   └── AudioManager.js # Web Audio API DSP pipeline (10-Band EQ, Mid/Side, Crossfade)
    │   ├── components/
    │   │   ├── EqualizerModal.jsx   # 10-Band EQ & stereo widening control panel
    │   │   ├── FullscreenPlayer.jsx # Apple Music-style lyrics & waveform visualizer
    │   │   ├── MusicFlowModal.jsx   # Vertical discovery swipe pager
    │   │   ├── Navbar.jsx           # Floating glass header with Echo Find recognition
    │   │   ├── PlayerBar.jsx        # Persistent glass audio controller
    │   │   └── TrackCard.jsx        # Glassmorphic track card
    │   ├── context/
    │   │   └── PlayerContext.jsx    # Global audio state & Echo Brain listener logging
    │   ├── screens/
    │   │   ├── HomeScreen.jsx       # Curated discovery shelves & circadian hero banner
    │   │   ├── SearchScreen.jsx     # Live query search & genre chip filters
    │   │   ├── LibraryScreen.jsx    # Liked songs & playlist manager
    │   │   └── TasteMixScreen.jsx   # Echo Brain analytics & smart mix generator
    │   ├── App.jsx
    │   ├── App.css
    │   └── index.css                # Liquid Glass design system & tokens
    ├── package.json
    └── vite.config.js               # Proxy /api to backend port 5001
```

---

## 🏃 Running the Application

Both servers are pre-configured to run concurrently:

### Backend
```powershell
cd dropify/backend
npm start
# Runs on http://localhost:5001
```

### Frontend
```powershell
cd dropify/frontend
npm run dev
# Accessible in your browser at http://localhost:3000
```
