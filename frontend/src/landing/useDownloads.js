import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'dropify_downloads_stats_v1';
const CLOUD_APP_KEY = 'jpbr785p';
const CLOUD_BASE_URL = 'https://keyvalue.immanuel.co/api/KeyVal';

const DEFAULT_STATS = {
  total: 1,
  android: 1,
  windows: 0
};

export default function useDownloads() {
  const [stats, setStats] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.total === 'number') {
          return {
            total: Math.max(parsed.total, 1),
            android: Math.max(parsed.android ?? 1, 1),
            windows: Math.max(parsed.windows ?? 0, 0)
          };
        }
      }
    } catch (_) {}
    return DEFAULT_STATS;
  });

  const [isIncrementing, setIsIncrementing] = useState(false);
  const [recentlyDownloaded, setRecentlyDownloaded] = useState(false);
  const bumpTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Sync latest stats from cloud KV and backend API on mount
  useEffect(() => {
    let isMounted = true;

    async function syncCloudStats() {
      let cloudTotal = null;
      let cloudAndroid = null;
      let cloudWindows = null;

      // 1. Try high-speed Cloud KV
      try {
        const [totalRes, androidRes, windowsRes] = await Promise.all([
          fetch(`${CLOUD_BASE_URL}/GetValue/${CLOUD_APP_KEY}/dropify_total_downloads`),
          fetch(`${CLOUD_BASE_URL}/GetValue/${CLOUD_APP_KEY}/dropify_android_downloads`),
          fetch(`${CLOUD_BASE_URL}/GetValue/${CLOUD_APP_KEY}/dropify_windows_downloads`)
        ]);

        if (totalRes.ok) {
          const val = await totalRes.json();
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed) && parsed > 0) cloudTotal = parsed;
        }

        if (androidRes.ok) {
          const val = await androidRes.json();
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed) && parsed >= 0) cloudAndroid = parsed;
        }

        if (windowsRes.ok) {
          const val = await windowsRes.json();
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed) && parsed >= 0) cloudWindows = parsed;
        }
      } catch (err) {
        // Silently fall back to cached / backend stats
      }

      // 2. Try backend API (/api/downloads)
      try {
        const apiRes = await fetch('/api/downloads');
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data && typeof data.total === 'number') {
            cloudTotal = Math.max(cloudTotal || 0, data.total);
            cloudAndroid = Math.max(cloudAndroid || 0, data.android || 0);
            cloudWindows = Math.max(cloudWindows || 0, data.windows || 0);
          }
        }
      } catch (_) {}

      if (isMounted && cloudTotal !== null) {
        setStats((prev) => {
          const next = {
            total: Math.max(prev.total, cloudTotal),
            android: Math.max(prev.android, cloudAndroid ?? prev.android),
            windows: Math.max(prev.windows, cloudWindows ?? prev.windows)
          };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch (_) {}
          return next;
        });
      }
    }

    syncCloudStats();

    return () => {
      isMounted = false;
      if (bumpTimeoutRef.current) clearTimeout(bumpTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const trackDownload = useCallback((platform = 'android') => {
    setStats((prev) => {
      const newTotal = prev.total + 1;
      const newAndroid = platform === 'android' ? prev.android + 1 : prev.android;
      const newWindows = platform === 'windows' ? prev.windows + 1 : prev.windows;

      const updated = {
        total: newTotal,
        android: newAndroid,
        windows: newWindows
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}

      // Trigger visual bump animation & celebration toast
      setIsIncrementing(true);
      if (bumpTimeoutRef.current) clearTimeout(bumpTimeoutRef.current);
      bumpTimeoutRef.current = setTimeout(() => setIsIncrementing(false), 800);

      setRecentlyDownloaded(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setRecentlyDownloaded(false), 5000);

      // Async background push to Cloud KV
      fetch(`${CLOUD_BASE_URL}/UpdateValue/${CLOUD_APP_KEY}/dropify_total_downloads/${newTotal}`, {
        method: 'POST',
        headers: { 'Content-Length': '0' }
      }).catch(() => {});

      if (platform === 'android') {
        fetch(`${CLOUD_BASE_URL}/UpdateValue/${CLOUD_APP_KEY}/dropify_android_downloads/${newAndroid}`, {
          method: 'POST',
          headers: { 'Content-Length': '0' }
        }).catch(() => {});
      } else {
        fetch(`${CLOUD_BASE_URL}/UpdateValue/${CLOUD_APP_KEY}/dropify_windows_downloads/${newWindows}`, {
          method: 'POST',
          headers: { 'Content-Length': '0' }
        }).catch(() => {});
      }

      // Async background push to backend API
      fetch('/api/downloads/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      }).catch(() => {});

      return updated;
    });
  }, []);

  const formatCount = useCallback((count) => {
    const num = Math.max(Number(count) || 1, 1);
    return `${num}+`;
  }, []);

  return {
    stats,
    isIncrementing,
    recentlyDownloaded,
    trackDownload,
    formatCount
  };
}
