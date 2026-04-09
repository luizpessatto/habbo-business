import { Container } from 'pixi.js';
import { tileToScreen, getDepth } from '../core/isometric';
import { createAgentSprite, createSelectionRing, type AgentColors } from './SpriteFactory';
import { ChatBubble } from './ChatBubble';

export interface AgentConfig {
  id: string;
  name: string;
  tileX: number;
  tileY: number;
  colors?: Partial<AgentColors>;
  status?: 'online' | 'offline' | 'busy';
}

export class AgentEntity {
  public id: string;
  public name: string;
  public tileX: number;
  public tileY: number;
  public container: Container;
  public selected = false;
  public chatBubble: ChatBubble;

  private selectionRing: ReturnType<typeof createSelectionRing> | null = null;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.tileX = config.tileX;
    this.tileY = config.tileY;

    // Create sprite
    this.container = createAgentSprite(
      config.name,
      config.colors,
      config.status ?? 'online'
    );

    // Create chat bubble
    this.chatBubble = new ChatBubble();
    this.container.addChild(this.chatBubble.container);

    // Position on screen
    this.updateScreenPosition();

    // Make interactive
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.hitArea = { contains: (x: number, y: number) => x >= -14 && x <= 14 && y >= -62 && y <= 4 };
  }

  updateScreenPosition() {
    const screen = tileToScreen(this.tileX, this.tileY);
    this.container.x = screen.x;
    this.container.y = screen.y;
    this.container.zIndex = getDepth(this.tileX, this.tileY) * 10 + 5;
  }

  setSelected(selected: boolean) {
    this.selected = selected;

    if (selected && !this.selectionRing) {
      this.selectionRing = createSelectionRing();
      this.selectionRing.y = 0;
      this.container.addChildAt(this.selectionRing, 0);
    } else if (!selected && this.selectionRing) {
      this.container.removeChild(this.selectionRing);
      this.selectionRing.destroy();
      this.selectionRing = null;
    }
  }

  setTile(x: number, y: number) {
    this.tileX = x;
    this.tileY = y;
    this.updateScreenPosition();
  }

  showBubble(message: string) {
    this.chatBubble.show(message, -70);
  }
}
