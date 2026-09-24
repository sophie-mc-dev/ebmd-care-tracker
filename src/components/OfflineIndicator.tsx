import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-600 text-white text-xs font-medium shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
      <WifiOff className="w-3.5 h-3.5 animate-pulse" />
      <span>Offline Mode — All logs saved locally on your device</span>
    </div>
  );
};
