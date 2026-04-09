// Isometric tile dimensions (2:1 ratio, classic Habbo style)
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

/**
 * Convert tile grid coordinates to screen pixel coordinates.
 * Returns the center-top of the diamond tile.
 */
export function tileToScreen(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: (tileX - tileY) * (TILE_WIDTH / 2),
    y: (tileX + tileY) * (TILE_HEIGHT / 2),
  };
}

/**
 * Convert screen pixel coordinates back to tile grid coordinates.
 */
export function screenToTile(screenX: number, screenY: number): { x: number; y: number } {
  const tileX = Math.floor(
    (screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2
  );
  const tileY = Math.floor(
    (screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2
  );
  return { x: tileX, y: tileY };
}

/**
 * Calculate depth for sorting. Higher depth = rendered later (on top).
 */
export function getDepth(tileX: number, tileY: number): number {
  return tileX + tileY;
}

/**
 * Check if a tile coordinate is within grid bounds.
 */
export function isInBounds(tileX: number, tileY: number, width: number, height: number): boolean {
  return tileX >= 0 && tileX < width && tileY >= 0 && tileY < height;
}
