import React from 'react';
import { Home, Search, Heart, Sparkles, Settings } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function MobileBottomNav({ activeTab, setActiveTab }) {
  const { setIsSettingsOpen } = usePlayer();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'taste', label: 'Taste', icon: Sparkles },
    { id: 'library', label: 'Library', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings, isAction: true }
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Bar">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (item.isAction) {
                setIsSettingsOpen(true);
              } else {
                setActiveTab(item.id);
              }
            }}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="mobile-nav-icon-wrap">
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && <span className="mobile-nav-active-pip" />}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
