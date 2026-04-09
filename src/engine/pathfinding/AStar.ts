import type { TilePosition } from '@/types';

interface Node {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to end
  f: number; // g + h
  parent: Node | null;
}

/**
 * Manhattan distance heuristic.
 */
function heuristic(a: TilePosition, b: TilePosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * 4-directional neighbors (N, S, E, W).
 */
const DIRECTIONS: TilePosition[] = [
  { x: 0, y: -1 }, // north
  { x: 0, y: 1 },  // south
  { x: 1, y: 0 },  // east
  { x: -1, y: 0 }, // west
];

/**
 * A* pathfinding on a 2D tile grid.
 *
 * @param start - Starting tile position
 * @param end - Target tile position
 * @param width - Grid width
 * @param height - Grid height
 * @param isWalkable - Function that returns true if a tile can be walked on
 * @returns Array of tile positions from start to end (inclusive), or empty if no path
 */
export function findPath(
  start: TilePosition,
  end: TilePosition,
  width: number,
  height: number,
  isWalkable: (x: number, y: number) => boolean
): TilePosition[] {
  // Early exit: target not walkable or same position
  if (!isWalkable(end.x, end.y)) return [];
  if (start.x === end.x && start.y === end.y) return [start];

  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const key = (x: number, y: number) => `${x},${y}`;

  const startNode: Node = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest f score
    let lowestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIdx].f) {
        lowestIdx = i;
      }
    }

    const current = openSet[lowestIdx];

    // Reached the goal
    if (current.x === end.x && current.y === end.y) {
      const path: TilePosition[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    // Move current from open to closed
    openSet.splice(lowestIdx, 1);
    closedSet.add(key(current.x, current.y));

    // Explore neighbors
    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      // Bounds check
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (!isWalkable(nx, ny)) continue;
      if (closedSet.has(key(nx, ny))) continue;

      const g = current.g + 1;
      const h = heuristic({ x: nx, y: ny }, end);
      const f = g + h;

      // Check if already in open set with a better path
      const existing = openSet.find((n) => n.x === nx && n.y === ny);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
        continue;
      }

      openSet.push({ x: nx, y: ny, g, h, f, parent: current });
    }
  }

  // No path found
  return [];
}
