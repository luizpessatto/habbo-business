import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { TILE_WIDTH, TILE_HEIGHT, tileToScreen, getDepth } from '../core/isometric';

// Tile types
export const TILE_EMPTY = 0;
export const TILE_FLOOR = 1;
export const TILE_WALL = 2;

// Floor tile color palette (Habbo-inspired)
const FLOOR_COLORS: Record<number, { top: number; left: number; right: number }> = {
  [TILE_FLOOR]: {
    top: 0x8bc34a,   // green top face
    left: 0x689f38,  // darker left face
    right: 0x558b2f, // darkest right face
  },
};

const WALL_COLOR = {
  front: 0x5d4e37,
  side: 0x4a3f2e,
  top: 0x6d5e47,
};

const WALL_HEIGHT = 48; // pixels

/**
 * Generate a default room layout (2D grid).
 */
export function generateDefaultLayout(width: number, height: number): number[][] {
  const layout: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(TILE_FLOOR);
    }
    layout.push(row);
  }
  return layout;
}

/**
 * Draw a single isometric floor tile (diamond shape with 3D depth effect).
 */
function drawFloorTile(g: Graphics, screenX: number, screenY: number, colors: { top: number; left: number; right: number }) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const depth = 4; // pixel depth for 3D effect

  // Top face (diamond)
  g.poly([
    screenX, screenY,
    screenX + hw, screenY + hh,
    screenX, screenY + TILE_HEIGHT,
    screenX - hw, screenY + hh,
  ]);
  g.fill(colors.top);

  // Left face (3D depth)
  g.poly([
    screenX - hw, screenY + hh,
    screenX, screenY + TILE_HEIGHT,
    screenX, screenY + TILE_HEIGHT + depth,
    screenX - hw, screenY + hh + depth,
  ]);
  g.fill(colors.left);

  // Right face (3D depth)
  g.poly([
    screenX + hw, screenY + hh,
    screenX, screenY + TILE_HEIGHT,
    screenX, screenY + TILE_HEIGHT + depth,
    screenX + hw, screenY + hh + depth,
  ]);
  g.fill(colors.right);

  // Top face outline
  g.poly([
    screenX, screenY,
    screenX + hw, screenY + hh,
    screenX, screenY + TILE_HEIGHT,
    screenX - hw, screenY + hh,
  ]);
  g.stroke({ width: 1, color: 0x000000, alpha: 0.15 });
}

/**
 * Draw wall segment along the north edge (left side of view).
 */
function drawNorthWall(g: Graphics, screenX: number, screenY: number) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;

  // Front face
  g.poly([
    screenX - hw, screenY + hh,
    screenX, screenY,
    screenX, screenY - WALL_HEIGHT,
    screenX - hw, screenY + hh - WALL_HEIGHT,
  ]);
  g.fill(WALL_COLOR.front);
  g.stroke({ width: 1, color: 0x000000, alpha: 0.2 });

  // Top face
  g.poly([
    screenX - hw, screenY + hh - WALL_HEIGHT,
    screenX, screenY - WALL_HEIGHT,
    screenX + hw, screenY + hh - WALL_HEIGHT,
    screenX, screenY + TILE_HEIGHT - WALL_HEIGHT,
  ]);
  g.fill(WALL_COLOR.top);
  g.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
}

/**
 * Draw wall segment along the west edge (right side of view).
 */
function drawWestWall(g: Graphics, screenX: number, screenY: number) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;

  // Side face
  g.poly([
    screenX + hw, screenY + hh,
    screenX, screenY,
    screenX, screenY - WALL_HEIGHT,
    screenX + hw, screenY + hh - WALL_HEIGHT,
  ]);
  g.fill(WALL_COLOR.side);
  g.stroke({ width: 1, color: 0x000000, alpha: 0.2 });

  // Top face
  g.poly([
    screenX - hw, screenY + hh - WALL_HEIGHT,
    screenX, screenY - WALL_HEIGHT,
    screenX + hw, screenY + hh - WALL_HEIGHT,
    screenX, screenY + TILE_HEIGHT - WALL_HEIGHT,
  ]);
  g.fill(WALL_COLOR.top);
  g.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
}

/**
 * Render a complete isometric room from a 2D layout array.
 * Returns a Container with all tiles and walls depth-sorted.
 */
export function renderRoom(layout: number[][]): Container {
  const container = new Container();
  const height = layout.length;
  const width = layout[0]?.length ?? 0;

  // Collect all renderable items with depth
  const items: { depth: number; draw: (g: Graphics) => void }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = layout[y][x];
      if (tile === TILE_EMPTY) continue;

      const { x: sx, y: sy } = tileToScreen(x, y);
      const depth = getDepth(x, y);

      if (tile === TILE_FLOOR) {
        // Draw walls on edges
        if (y === 0) {
          items.push({
            depth: depth - 0.5,
            draw: (g) => drawNorthWall(g, sx, sy),
          });
        }
        if (x === 0) {
          items.push({
            depth: depth - 0.5,
            draw: (g) => drawWestWall(g, sx, sy),
          });
        }

        items.push({
          depth,
          draw: (g) => drawFloorTile(g, sx, sy, FLOOR_COLORS[TILE_FLOOR]),
        });
      }
    }
  }

  // Sort by depth (back to front)
  items.sort((a, b) => a.depth - b.depth);

  // Draw everything into a single Graphics object for performance
  const gfx = new Graphics();
  for (const item of items) {
    item.draw(gfx);
  }
  container.addChild(gfx);

  // Add room label
  const label = new Text({
    text: '🏠 My Room',
    style: new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xffffff,
      dropShadow: {
        alpha: 0.8,
        blur: 2,
        distance: 1,
      },
    }),
  });
  const topLeft = tileToScreen(0, 0);
  label.x = topLeft.x - 40;
  label.y = topLeft.y - WALL_HEIGHT - 20;
  container.addChild(label);

  return container;
}

/**
 * Draw a hover highlight on a specific tile.
 */
export function drawTileHighlight(g: Graphics, tileX: number, tileY: number, color: number = 0xffffff) {
  const { x: sx, y: sy } = tileToScreen(tileX, tileY);
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;

  g.clear();
  g.poly([
    sx, sy,
    sx + hw, sy + hh,
    sx, sy + TILE_HEIGHT,
    sx - hw, sy + hh,
  ]);
  g.fill({ color, alpha: 0.3 });
  g.stroke({ width: 2, color, alpha: 0.6 });
}
