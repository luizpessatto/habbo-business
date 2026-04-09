'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { renderRoom, generateDefaultLayout, drawTileHighlight } from '@/engine/rooms/RoomRenderer';
import { tileToScreen, screenToTile, isInBounds } from '@/engine/core/isometric';
import { AgentEntity } from '@/engine/entities/AgentEntity';
import { AgentMovement } from '@/engine/entities/AgentMovement';
import { AgentBehavior } from '@/engine/core/AgentBehavior';
import { findPath } from '@/engine/pathfinding/AStar';

const ROOM_WIDTH = 12;
const ROOM_HEIGHT = 12;

// Demo agents for Phase 4
const DEMO_AGENTS = [
  {
    id: 'agent-1',
    name: 'Claude',
    tileX: 3,
    tileY: 4,
    colors: { hair: 0xd4a574, shirt: 0xd97706, pants: 0x1e3a5f },
    status: 'online' as const,
  },
  {
    id: 'agent-2',
    name: 'GPT',
    tileX: 7,
    tileY: 5,
    colors: { hair: 0x222222, shirt: 0x10a37f, pants: 0x333333 },
    status: 'online' as const,
  },
  {
    id: 'agent-3',
    name: 'Gemini',
    tileX: 5,
    tileY: 8,
    colors: { hair: 0x4285f4, shirt: 0xea4335, pants: 0x34a853 },
    status: 'busy' as const,
  },
];

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const selectedAgentRef = useRef<AgentEntity | null>(null);
  const agentsRef = useRef<AgentEntity[]>([]);
  const movementsRef = useRef<Map<string, AgentMovement>>(new Map());
  const behaviorsRef = useRef<Map<string, AgentBehavior>>(new Map());

  const init = useCallback(async () => {
    if (!containerRef.current || appRef.current) return;

    const app = new Application();
    await app.init({
      background: 0x1a1a2e,
      resizeTo: containerRef.current,
      antialias: false,
      resolution: 1,
    });

    containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
    appRef.current = app;

    // Create world container
    const world = new Container();
    world.sortableChildren = true;
    worldRef.current = world;
    app.stage.addChild(world);

    // Generate and render room
    const layout = generateDefaultLayout(ROOM_WIDTH, ROOM_HEIGHT);
    const roomContainer = renderRoom(layout);
    roomContainer.zIndex = 0;
    world.addChild(roomContainer);

    // Tile hover highlight
    const hoverGfx = new Graphics();
    hoverGfx.zIndex = 1;
    world.addChild(hoverGfx);

    // Path preview graphics
    const pathGfx = new Graphics();
    pathGfx.zIndex = 1;
    world.addChild(pathGfx);

    // Agents layer
    const agentsContainer = new Container();
    agentsContainer.sortableChildren = true;
    agentsContainer.zIndex = 2;
    world.addChild(agentsContainer);

    // Occupied tiles tracker
    const occupiedTiles = new Set<string>();
    const tileKey = (x: number, y: number) => `${x},${y}`;

    const isWalkable = (x: number, y: number) => {
      if (!isInBounds(x, y, ROOM_WIDTH, ROOM_HEIGHT)) return false;
      if (layout[y][x] === 0) return false;
      // Allow walking to occupied tiles if it's the selected agent's current tile
      return true;
    };

    // Create agents + movement controllers
    const agents: AgentEntity[] = DEMO_AGENTS.map((cfg) => {
      const agent = new AgentEntity(cfg);
      agentsContainer.addChild(agent.container);
      occupiedTiles.add(tileKey(cfg.tileX, cfg.tileY));

      const movement = new AgentMovement(agent);
      movementsRef.current.set(cfg.id, movement);

      agent.container.on('pointertap', (e) => {
        e.stopPropagation();

        // Deselect previous
        if (selectedAgentRef.current && selectedAgentRef.current !== agent) {
          selectedAgentRef.current.setSelected(false);
        }

        const newSelected = !agent.selected;
        agent.setSelected(newSelected);
        selectedAgentRef.current = newSelected ? agent : null;

        // Clear path preview
        pathGfx.clear();

        window.dispatchEvent(
          new CustomEvent('agent-selected', {
            detail: newSelected ? { id: agent.id, name: agent.name } : null,
          })
        );
      });

      return agent;
    });
    agentsRef.current = agents;

    // Create autonomous behaviors for each agent
    for (const agent of agents) {
      const movement = movementsRef.current.get(agent.id)!;
      const behavior = new AgentBehavior(
        agent,
        movement,
        { autonomousMovement: true, canInitiateChat: true, chatFrequency: 'normal' },
        ROOM_WIDTH,
        ROOM_HEIGHT,
        isWalkable,
        () => agents,
      );

      // When agent wants to chat with another
      behavior.setOnInitiateChat((initiator, target) => {
        // Show thought bubble on initiator
        initiator.showBubble(`💭 ...`);

        // Dispatch event for the page to handle via server action
        window.dispatchEvent(
          new CustomEvent('agent-agent-chat', {
            detail: { initiatorId: initiator.id, targetId: target.id },
          })
        );
      });

      behaviorsRef.current.set(agent.id, behavior);
    }

    // Center room
    const centerTile = tileToScreen(6, 6);
    world.x = app.screen.width / 2 - centerTile.x;
    world.y = app.screen.height / 2 - centerTile.y + 40;

    const canvas = app.canvas as HTMLCanvasElement;

    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        sx: (clientX - rect.left - world.x) / world.scale.x,
        sy: (clientY - rect.top - world.y) / world.scale.y,
      };
    };

    let hoveredTile = { x: -1, y: -1 };
    let didDrag = false;

    // --- Draw path preview dots ---
    function drawPathPreview(path: { x: number; y: number }[]) {
      pathGfx.clear();
      for (let i = 1; i < path.length; i++) {
        const screen = tileToScreen(path[i].x, path[i].y);
        pathGfx.circle(screen.x, screen.y + 16, 3);
        pathGfx.fill({ color: 0x00e5ff, alpha: 0.5 });
      }
    }

    // --- Event handlers ---
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 1 || e.button === 2) {
        isDragging.current = true;
        didDrag = false;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
      if (e.button === 0) {
        didDrag = false;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging.current && worldRef.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag = true;
        worldRef.current.x += dx;
        worldRef.current.y += dy;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Tile hover
      const { sx, sy } = screenToWorld(e.clientX, e.clientY);
      const tile = screenToTile(sx, sy);

      if (tile.x !== hoveredTile.x || tile.y !== hoveredTile.y) {
        hoveredTile = tile;
        if (isInBounds(tile.x, tile.y, ROOM_WIDTH, ROOM_HEIGHT)) {
          // Show path preview if agent is selected
          const sel = selectedAgentRef.current;
          if (sel) {
            const path = findPath(
              { x: sel.tileX, y: sel.tileY },
              { x: tile.x, y: tile.y },
              ROOM_WIDTH,
              ROOM_HEIGHT,
              isWalkable
            );
            if (path.length > 1) {
              drawPathPreview(path);
              drawTileHighlight(hoverGfx, tile.x, tile.y, 0x00e5ff);
            } else {
              pathGfx.clear();
              drawTileHighlight(hoverGfx, tile.x, tile.y, 0xff4444);
            }
          } else {
            pathGfx.clear();
            drawTileHighlight(hoverGfx, tile.x, tile.y, 0xffffff);
          }
        } else {
          hoverGfx.clear();
          pathGfx.clear();
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 1 || e.button === 2) {
        isDragging.current = false;
        canvas.style.cursor = 'default';
        return;
      }

      // Left click release - handle click-to-move
      if (e.button === 0 && !didDrag) {
        const { sx, sy } = screenToWorld(e.clientX, e.clientY);
        const tile = screenToTile(sx, sy);

        // Check if clicked on an agent
        const clickedAgent = agents.find((a) => {
          const aScreen = tileToScreen(a.tileX, a.tileY);
          const dx = Math.abs(sx - aScreen.x);
          const relY = sy - aScreen.y;
          return dx < 16 && relY > -64 && relY < 6;
        });

        if (clickedAgent) {
          // Agent click is handled by PixiJS pointertap
          return;
        }

        if (!isInBounds(tile.x, tile.y, ROOM_WIDTH, ROOM_HEIGHT)) return;

        const sel = selectedAgentRef.current;
        if (sel) {
          const path = findPath(
            { x: sel.tileX, y: sel.tileY },
            { x: tile.x, y: tile.y },
            ROOM_WIDTH,
            ROOM_HEIGHT,
            isWalkable
          );

          if (path.length > 1) {
            const movement = movementsRef.current.get(sel.id);
            if (movement) {
              // Cancel any existing movement
              movement.cancel();

              // Update occupied tiles
              occupiedTiles.delete(tileKey(sel.tileX, sel.tileY));

              movement.startPath(path, () => {
                occupiedTiles.add(tileKey(sel.tileX, sel.tileY));
                pathGfx.clear();
              });
            }
          }
        } else {
          // No agent selected, deselect
          pathGfx.clear();
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!worldRef.current) return;
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(2.5, Math.max(0.4, worldRef.current.scale.x * scaleFactor));

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldPos = {
        x: (mouseX - worldRef.current.x) / worldRef.current.scale.x,
        y: (mouseY - worldRef.current.y) / worldRef.current.scale.y,
      };

      worldRef.current.scale.set(newScale);
      worldRef.current.x = mouseX - worldPos.x * newScale;
      worldRef.current.y = mouseY - worldPos.y * newScale;
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    // WASD keyboard pan
    const PAN_SPEED = 8;
    const keysDown = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.key.toLowerCase());
      // Escape to deselect
      if (e.key === 'Escape' && selectedAgentRef.current) {
        selectedAgentRef.current.setSelected(false);
        selectedAgentRef.current = null;
        pathGfx.clear();
        window.dispatchEvent(new CustomEvent('agent-selected', { detail: null }));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysDown.delete(e.key.toLowerCase());

    // Game loop - update movements
    app.ticker.add((ticker) => {
      if (!worldRef.current) return;

      // Camera pan
      if (keysDown.has('w') || keysDown.has('arrowup')) worldRef.current.y += PAN_SPEED;
      if (keysDown.has('s') || keysDown.has('arrowdown')) worldRef.current.y -= PAN_SPEED;
      if (keysDown.has('a') || keysDown.has('arrowleft')) worldRef.current.x += PAN_SPEED;
      if (keysDown.has('d') || keysDown.has('arrowright')) worldRef.current.x -= PAN_SPEED;

      // Update agent movements
      const delta = ticker.deltaMS / 1000; // convert ms to seconds
      for (const movement of movementsRef.current.values()) {
        movement.update(delta);
      }

      // Update agent autonomous behaviors
      for (const behavior of behaviorsRef.current.values()) {
        behavior.update(ticker.deltaMS);
      }
    });

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', () => {
      isDragging.current = false;
      canvas.style.cursor = 'default';
    });
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Listen for chat bubble events
    const onChatBubble = (e: Event) => {
      const { agentId, message } = (e as CustomEvent).detail;
      const agent = agents.find((a) => a.id === agentId);
      if (agent) {
        agent.showBubble(message);
      }
    };
    window.addEventListener('chat-bubble', onChatBubble);

    // Listen for agent-agent chat end
    const onAgentChatEnd = (e: Event) => {
      const { initiatorId, targetId } = (e as CustomEvent).detail;
      const initBehavior = behaviorsRef.current.get(initiatorId);
      const targetBehavior = behaviorsRef.current.get(targetId);
      initBehavior?.endChat();
      targetBehavior?.endChat();
    };
    window.addEventListener('agent-agent-chat-end', onAgentChatEnd);

    (app as any).__cleanup = () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('chat-bubble', onChatBubble);
      window.removeEventListener('agent-agent-chat-end', onAgentChatEnd);
    };
  }, []);

  useEffect(() => {
    init();
    return () => {
      if (appRef.current) {
        (appRef.current as any).__cleanup?.();
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [init]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}
    />
  );
}
