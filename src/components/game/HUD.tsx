'use client';

import { useState, useEffect } from 'react';

interface SelectedAgent {
  id: string;
  name: string;
}

interface HUDProps {
  roomName?: string;
}

export default function HUD({ roomName }: HUDProps) {
  const [selectedAgent, setSelectedAgent] = useState<SelectedAgent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSelectedAgent(detail);
    };
    window.addEventListener('agent-selected', handler);
    return () => window.removeEventListener('agent-selected', handler);
  }, []);

  return (
    <>
      {/* Title HUD */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="pointer-events-auto bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-white font-mono">
          <h1 className="text-lg font-bold tracking-wider">AI HOTEL</h1>
          <p className="text-xs text-white/60 mt-0.5">
            Scroll to zoom · Middle-click to pan · WASD to move
          </p>
        </div>
      </div>

      {/* Selected agent info */}
      {selectedAgent && (
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
          <div className="pointer-events-auto bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3 text-white font-mono min-w-[200px]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-sm font-bold">{selectedAgent.name}</span>
            </div>
            <p className="text-xs text-white/50 mt-1.5">
              Click a tile to move · ESC to deselect
            </p>
          </div>
        </div>
      )}

      {/* Room info */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="pointer-events-auto bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white/80 font-mono text-xs">
          Room: {roomName ?? 'My Room'} · Agents: 3 · Tiles: 12x12
        </div>
      </div>
    </>
  );
}
