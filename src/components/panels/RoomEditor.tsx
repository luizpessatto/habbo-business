'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Paintbrush, Eraser, Save, X, Grid3X3, Sofa } from 'lucide-react';

interface RoomEditorProps {
  active: boolean;
  onToggle: () => void;
  onTileClick?: (x: number, y: number, tool: string) => void;
  onSave?: () => void;
}

const TILE_TYPES = [
  { id: 'floor-green', label: 'Grass', color: '#8bc34a' },
  { id: 'floor-wood', label: 'Wood', color: '#8d6e63' },
  { id: 'floor-stone', label: 'Stone', color: '#78909c' },
  { id: 'floor-carpet', label: 'Carpet', color: '#7b1fa2' },
  { id: 'floor-sand', label: 'Sand', color: '#ffb74d' },
];

const FURNITURE = [
  { id: 'table', label: 'Table', icon: '🪑' },
  { id: 'plant', label: 'Plant', icon: '🌿' },
  { id: 'lamp', label: 'Lamp', icon: '💡' },
  { id: 'computer', label: 'Computer', icon: '💻' },
  { id: 'bookshelf', label: 'Books', icon: '📚' },
  { id: 'bed', label: 'Bed', icon: '🛏️' },
];

export default function RoomEditor({ active, onToggle, onSave }: RoomEditorProps) {
  const [selectedTool, setSelectedTool] = useState<string>('floor-green');
  const [mode, setMode] = useState<'tiles' | 'furniture' | 'erase'>('tiles');

  if (!active) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-28 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white font-mono text-sm flex items-center gap-2 hover:bg-black/80 transition-colors cursor-pointer select-none"
      >
        <Paintbrush size={16} />
        Editor
      </button>
    );
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-[#16213e]/95 backdrop-blur-md border border-[#0f3460] rounded-xl shadow-2xl px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Paintbrush size={16} className="text-cyan-400" />
            <span className="font-mono text-sm font-bold text-white">Room Editor</span>
            <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px]">EDIT MODE</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={onSave}
              className="h-7 bg-green-600 hover:bg-green-700 text-xs"
            >
              <Save size={12} className="mr-1" /> Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
              className="h-7 text-white/50 hover:text-white hover:bg-white/10"
            >
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1 mb-3">
          <Button
            size="sm"
            variant={mode === 'tiles' ? 'default' : 'ghost'}
            onClick={() => setMode('tiles')}
            className={`h-7 text-xs ${mode === 'tiles' ? 'bg-[#e94560]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Grid3X3 size={12} className="mr-1" /> Tiles
          </Button>
          <Button
            size="sm"
            variant={mode === 'furniture' ? 'default' : 'ghost'}
            onClick={() => setMode('furniture')}
            className={`h-7 text-xs ${mode === 'furniture' ? 'bg-[#e94560]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Sofa size={12} className="mr-1" /> Furniture
          </Button>
          <Button
            size="sm"
            variant={mode === 'erase' ? 'default' : 'ghost'}
            onClick={() => setMode('erase')}
            className={`h-7 text-xs ${mode === 'erase' ? 'bg-red-600' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Eraser size={12} className="mr-1" /> Erase
          </Button>
        </div>

        <Separator className="bg-[#0f3460] mb-3" />

        {/* Tiles palette */}
        {mode === 'tiles' && (
          <div className="flex gap-2">
            {TILE_TYPES.map((tile) => (
              <button
                key={tile.id}
                onClick={() => setSelectedTool(tile.id)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded transition-all ${
                  selectedTool === tile.id
                    ? 'ring-2 ring-cyan-400 bg-white/10'
                    : 'hover:bg-white/5'
                }`}
                title={tile.label}
              >
                <div
                  className="w-7 h-7 rounded-sm border border-white/20"
                  style={{ backgroundColor: tile.color }}
                />
                <span className="text-[9px] text-white/50">{tile.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Furniture palette */}
        {mode === 'furniture' && (
          <div className="flex gap-2 flex-wrap">
            {FURNITURE.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedTool(item.id)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded transition-all ${
                  selectedTool === item.id
                    ? 'ring-2 ring-cyan-400 bg-white/10'
                    : 'hover:bg-white/5'
                }`}
                title={item.label}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[9px] text-white/50">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Erase mode info */}
        {mode === 'erase' && (
          <p className="text-xs text-white/40 text-center py-2">
            Click tiles or furniture to remove them
          </p>
        )}
      </div>
    </div>
  );
}
