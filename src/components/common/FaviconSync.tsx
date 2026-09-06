import React, { useEffect, useCallback } from 'react';
import { useTableSync } from '../../hooks/useRealtimeSync';

export const FaviconSync: React.FC = () => {
  const updateIcons = useCallback((iconUrl: string) => {
    if (!iconUrl) return;

    // Update or create favicon link tags
    let iconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = iconUrl;

    // Update shortcut icon
    let shortcutLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
    if (!shortcutLink) {
      shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      document.head.appendChild(shortcutLink);
    }
    shortcutLink.href = iconUrl;

    // Update apple touch icon
    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = iconUrl;
  }, []);

  const refreshFavicon = useCallback(() => {
    fetch('/api/public/site-data')
      .then(res => res.json())
      .then(data => {
        const logo = data?.branding?.appIcon || data?.branding?.logo;
        if (logo && typeof logo === 'string' && logo.trim() !== '') {
          updateIcons(logo);
        }
      })
      .catch(() => {
        updateIcons('/arc-app-icon.png');
      });
  }, [updateIcons]);

  useEffect(() => {
    refreshFavicon();
  }, [refreshFavicon]);

  // Listen to realtime settings updates
  useTableSync('settings', () => {
    refreshFavicon();
  });

  return null;
};
