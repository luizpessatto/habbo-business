'use client';

import { useState, useEffect, useTransition } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listPublicRooms } from '@/app/(game)/actions/public-rooms';
import { DoorOpen, Users, ArrowRight, Home } from 'lucide-react';

interface RoomInfo {
  id: string;
  name: string;
  room_type: string;
  width: number;
  height: number;
}

const ROOM_ICONS: Record<string, string> = {
  Lobby: '🏛️',
  Cafe: '☕',
  Lab: '🔬',
};

interface RoomBrowserProps {
  currentRoomId?: string;
  onEnterRoom: (roomId: string, roomName: string, width: number, height: number) => void;
  onGoHome: () => void;
}

export default function RoomBrowser({ currentRoomId, onEnterRoom, onGoHome }: RoomBrowserProps) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      startTransition(async () => {
        const result = await listPublicRooms();
        if (result.data) setRooms(result.data);
      });
    }
  }, [open]);

  function handleEnter(room: RoomInfo) {
    onEnterRoom(room.id, room.name, room.width, room.height);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <div
            role="button"
            tabIndex={0}
            className="absolute top-16 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white font-mono text-sm flex items-center gap-2 hover:bg-black/80 transition-colors cursor-pointer select-none"
          />
        }
      >
        <DoorOpen size={16} />
        Rooms
      </SheetTrigger>
      <SheetContent className="bg-[#16213e] border-[#0f3460] text-white w-[360px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white font-mono flex items-center gap-2">
            <DoorOpen size={20} /> Public Rooms
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {/* Go Home button */}
          <Button
            onClick={() => { onGoHome(); setOpen(false); }}
            variant="outline"
            className="w-full border-[#0f3460] text-white/70 hover:bg-[#0f3460] hover:text-white"
          >
            <Home size={16} className="mr-2" /> Voltar ao Meu Quarto
          </Button>

          <div className="h-px bg-[#0f3460]" />

          {isPending ? (
            <div className="text-center py-8 text-white/40 text-sm">Carregando...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">
              Nenhum quarto publico disponivel.
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className={`bg-[#1a1a2e] rounded-lg p-4 space-y-2 ${
                  currentRoomId === room.id ? 'ring-1 ring-cyan-500/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{ROOM_ICONS[room.name] ?? '🚪'}</span>
                    <span className="font-mono text-sm font-bold">{room.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-[#0f3460] text-white/50">
                    {room.width}x{room.height}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-white/40 text-xs">
                    <Users size={12} />
                    <span>Public</span>
                  </div>
                  {currentRoomId === room.id ? (
                    <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px]">Voce esta aqui</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleEnter(room)}
                      className="h-7 bg-[#e94560] hover:bg-[#c73e54] text-xs"
                    >
                      Entrar <ArrowRight size={12} className="ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
