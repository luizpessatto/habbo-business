import { Container, Graphics, Text, TextStyle } from 'pixi.js';

const BUBBLE_MAX_WIDTH = 150;
const BUBBLE_PADDING = 8;
const BUBBLE_RADIUS = 6;
const SHOW_DURATION = 5000; // ms
const FADE_DURATION = 500; // ms

export class ChatBubble {
  public container: Container;
  private bg: Graphics;
  private text: Text;
  private timer: number | null = null;
  private fadeTimer: number | null = null;

  constructor() {
    this.container = new Container();
    this.container.visible = false;
    this.container.label = 'chatBubble';

    this.bg = new Graphics();
    this.container.addChild(this.bg);

    this.text = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0x1a1a2e,
        wordWrap: true,
        wordWrapWidth: BUBBLE_MAX_WIDTH - BUBBLE_PADDING * 2,
        lineHeight: 13,
      }),
    });
    this.container.addChild(this.text);
  }

  show(message: string, yOffset: number = -70) {
    // Clear existing timers
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    // Truncate long messages
    const displayText = message.length > 100 ? message.slice(0, 97) + '...' : message;

    this.text.text = displayText;
    this.text.x = -this.text.width / 2;
    this.text.y = yOffset - this.text.height - BUBBLE_PADDING * 2 + BUBBLE_PADDING;

    // Draw bubble background
    const w = this.text.width + BUBBLE_PADDING * 2;
    const h = this.text.height + BUBBLE_PADDING * 2;
    const x = -w / 2;
    const y = yOffset - h;

    this.bg.clear();

    // Bubble body
    this.bg.roundRect(x, y, w, h, BUBBLE_RADIUS);
    this.bg.fill({ color: 0xffffff, alpha: 0.95 });
    this.bg.stroke({ width: 1, color: 0x000000, alpha: 0.1 });

    // Tail (triangle pointing down)
    this.bg.moveTo(-4, y + h);
    this.bg.lineTo(0, y + h + 6);
    this.bg.lineTo(4, y + h);
    this.bg.closePath();
    this.bg.fill({ color: 0xffffff, alpha: 0.95 });

    this.container.visible = true;
    this.container.alpha = 1;

    // Auto-hide after duration
    this.timer = window.setTimeout(() => {
      this.fadeOut();
    }, SHOW_DURATION);
  }

  private fadeOut() {
    const startAlpha = this.container.alpha;
    const startTime = Date.now();

    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      this.container.alpha = startAlpha * (1 - progress);

      if (progress < 1) {
        this.fadeTimer = window.setTimeout(fade, 16);
      } else {
        this.container.visible = false;
      }
    };

    fade();
  }

  hide() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    this.container.visible = false;
  }

  destroy() {
    this.hide();
    this.container.destroy({ children: true });
  }
}
