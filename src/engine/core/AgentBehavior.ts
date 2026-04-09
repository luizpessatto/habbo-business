import type { AgentEntity } from '../entities/AgentEntity';
import type { AgentMovement } from '../entities/AgentMovement';
import { findPath } from '../pathfinding/AStar';

export type BehaviorState = 'IDLE' | 'WALKING' | 'CHATTING' | 'WAITING';

interface BehaviorConfig {
  autonomousMovement: boolean;
  canInitiateChat: boolean;
  chatFrequency: 'rare' | 'normal' | 'frequent';
}

const CHAT_FREQUENCY_CHANCE: Record<string, number> = {
  rare: 0.05,
  normal: 0.15,
  frequent: 0.3,
};

const IDLE_MIN_MS = 2000;
const IDLE_MAX_MS = 6000;
const PROXIMITY_RANGE = 3; // tiles

export class AgentBehavior {
  public state: BehaviorState = 'IDLE';
  public chatPartnerId: string | null = null;

  private agent: AgentEntity;
  private movement: AgentMovement;
  private config: BehaviorConfig;
  private roomWidth: number;
  private roomHeight: number;
  private idleTimer = 0;
  private nextIdleAction = 0;
  private isWalkable: (x: number, y: number) => boolean;
  private getAgents: () => AgentEntity[];
  private onInitiateChat: ((initiator: AgentEntity, target: AgentEntity) => void) | null = null;

  constructor(
    agent: AgentEntity,
    movement: AgentMovement,
    config: BehaviorConfig,
    roomWidth: number,
    roomHeight: number,
    isWalkable: (x: number, y: number) => boolean,
    getAgents: () => AgentEntity[],
  ) {
    this.agent = agent;
    this.movement = movement;
    this.config = config;
    this.roomWidth = roomWidth;
    this.roomHeight = roomHeight;
    this.isWalkable = isWalkable;
    this.getAgents = getAgents;
    this.scheduleNextIdle();
  }

  setOnInitiateChat(cb: (initiator: AgentEntity, target: AgentEntity) => void) {
    this.onInitiateChat = cb;
  }

  private scheduleNextIdle() {
    this.nextIdleAction = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
    this.idleTimer = 0;
  }

  /**
   * Update behavior each frame. deltaMs is milliseconds since last frame.
   */
  update(deltaMs: number) {
    if (!this.config.autonomousMovement && !this.config.canInitiateChat) return;
    if (this.state === 'CHATTING') return; // controlled externally during chat
    if (this.state === 'WALKING') {
      if (!this.movement.isMoving) {
        this.state = 'IDLE';
        this.scheduleNextIdle();
      }
      return;
    }

    // IDLE state
    this.idleTimer += deltaMs;

    if (this.idleTimer >= this.nextIdleAction) {
      this.idleTimer = 0;

      // Decide action
      const action = this.decideAction();

      if (action === 'move' && this.config.autonomousMovement) {
        this.moveToRandomTile();
      } else if (action === 'chat' && this.config.canInitiateChat) {
        this.tryInitiateChat();
      }

      this.scheduleNextIdle();
    }
  }

  private decideAction(): 'move' | 'chat' | 'idle' {
    // Check for nearby agents for chat
    const nearby = this.findNearbyAgent();
    if (nearby && this.config.canInitiateChat) {
      const chance = CHAT_FREQUENCY_CHANCE[this.config.chatFrequency] ?? 0.15;
      if (Math.random() < chance) {
        return 'chat';
      }
    }

    // Otherwise, move
    if (this.config.autonomousMovement && Math.random() < 0.7) {
      return 'move';
    }

    return 'idle';
  }

  private moveToRandomTile() {
    // Pick random walkable tile within a reasonable range
    const range = 5;
    let attempts = 0;
    while (attempts < 10) {
      const tx = this.agent.tileX + Math.floor(Math.random() * range * 2) - range;
      const ty = this.agent.tileY + Math.floor(Math.random() * range * 2) - range;

      if (
        tx >= 0 && tx < this.roomWidth &&
        ty >= 0 && ty < this.roomHeight &&
        this.isWalkable(tx, ty) &&
        (tx !== this.agent.tileX || ty !== this.agent.tileY)
      ) {
        const path = findPath(
          { x: this.agent.tileX, y: this.agent.tileY },
          { x: tx, y: ty },
          this.roomWidth,
          this.roomHeight,
          this.isWalkable
        );

        if (path.length > 1 && path.length <= 10) {
          this.state = 'WALKING';
          this.movement.startPath(path, () => {
            this.state = 'IDLE';
            this.scheduleNextIdle();
          });
          return;
        }
      }
      attempts++;
    }
  }

  private findNearbyAgent(): AgentEntity | null {
    const agents = this.getAgents();
    for (const other of agents) {
      if (other.id === this.agent.id) continue;
      const dx = Math.abs(other.tileX - this.agent.tileX);
      const dy = Math.abs(other.tileY - this.agent.tileY);
      if (dx + dy <= PROXIMITY_RANGE) {
        return other;
      }
    }
    return null;
  }

  private tryInitiateChat() {
    const target = this.findNearbyAgent();
    if (!target) return;

    this.state = 'CHATTING';
    this.chatPartnerId = target.id;
    this.onInitiateChat?.(this.agent, target);
  }

  /**
   * Called externally when a chat session ends.
   */
  endChat() {
    this.state = 'IDLE';
    this.chatPartnerId = null;
    this.scheduleNextIdle();
  }

  /**
   * Start a chat initiated by another agent.
   */
  startExternalChat(partnerId: string) {
    this.state = 'CHATTING';
    this.chatPartnerId = partnerId;
  }
}
