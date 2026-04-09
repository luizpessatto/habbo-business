import type { TilePosition } from '@/types';
import { tileToScreen, getDepth } from '../core/isometric';
import type { AgentEntity } from './AgentEntity';

const MOVE_SPEED = 2; // tiles per second

export class AgentMovement {
  private agent: AgentEntity;
  private path: TilePosition[] = [];
  private currentPathIndex = 0;
  private progress = 0; // 0 to 1 between current and next tile
  private moving = false;
  private onArrive: (() => void) | null = null;

  constructor(agent: AgentEntity) {
    this.agent = agent;
  }

  get isMoving() {
    return this.moving;
  }

  /**
   * Start moving along a path.
   */
  startPath(path: TilePosition[], onArrive?: () => void) {
    if (path.length < 2) {
      onArrive?.();
      return;
    }

    this.path = path;
    this.currentPathIndex = 0;
    this.progress = 0;
    this.moving = true;
    this.onArrive = onArrive ?? null;
  }

  /**
   * Cancel current movement. Agent stays at nearest tile.
   */
  cancel() {
    if (!this.moving) return;

    // Snap to nearest tile
    const nearest = this.progress < 0.5
      ? this.path[this.currentPathIndex]
      : this.path[this.currentPathIndex + 1] ?? this.path[this.currentPathIndex];

    if (nearest) {
      this.agent.setTile(nearest.x, nearest.y);
    }

    this.moving = false;
    this.path = [];
    this.onArrive = null;
  }

  /**
   * Update movement each frame. Call with delta time in seconds.
   */
  update(deltaSeconds: number) {
    if (!this.moving || this.path.length < 2) return;

    this.progress += MOVE_SPEED * deltaSeconds;

    while (this.progress >= 1 && this.currentPathIndex < this.path.length - 1) {
      this.progress -= 1;
      this.currentPathIndex++;

      // Update the agent's logical tile position
      const tile = this.path[this.currentPathIndex];
      this.agent.tileX = tile.x;
      this.agent.tileY = tile.y;

      // Check if we've reached the end
      if (this.currentPathIndex >= this.path.length - 1) {
        this.moving = false;
        this.agent.setTile(tile.x, tile.y);
        this.onArrive?.();
        this.onArrive = null;
        return;
      }
    }

    // Interpolate screen position between current and next tile
    const from = this.path[this.currentPathIndex];
    const to = this.path[this.currentPathIndex + 1];

    if (from && to) {
      const fromScreen = tileToScreen(from.x, from.y);
      const toScreen = tileToScreen(to.x, to.y);

      const t = Math.min(this.progress, 1);
      this.agent.container.x = fromScreen.x + (toScreen.x - fromScreen.x) * t;
      this.agent.container.y = fromScreen.y + (toScreen.y - fromScreen.y) * t;

      // Interpolate depth for correct sorting during movement
      const fromDepth = getDepth(from.x, from.y);
      const toDepth = getDepth(to.x, to.y);
      this.agent.container.zIndex = (fromDepth + (toDepth - fromDepth) * t) * 10 + 5;
    }
  }
}
