import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface AgentColors {
  hair: number;
  skin: number;
  shirt: number;
  pants: number;
}

const DEFAULT_COLORS: AgentColors = {
  hair: 0x333333,
  skin: 0xf5d0a9,
  shirt: 0x4a90d9,
  pants: 0x2c3e50,
};

/**
 * Create a pixel-art style isometric agent figure using PixiJS Graphics.
 * The agent is drawn facing south-east (default Habbo idle pose).
 * Origin (0,0) is at the agent's feet (bottom-center).
 */
export function createAgentSprite(
  name: string,
  colors: Partial<AgentColors> = {},
  status: 'online' | 'offline' | 'busy' = 'online'
): Container {
  const c = { ...DEFAULT_COLORS, ...colors };
  const container = new Container();
  container.label = 'agent';

  const g = new Graphics();

  // Shadow (ellipse under feet)
  g.ellipse(0, 0, 14, 6);
  g.fill({ color: 0x000000, alpha: 0.25 });

  // === Body (drawn bottom-up) ===

  // Shoes
  g.roundRect(-8, -6, 7, 5, 1);
  g.fill(0x1a1a1a);
  g.roundRect(1, -6, 7, 5, 1);
  g.fill(0x1a1a1a);

  // Pants
  g.roundRect(-9, -18, 8, 13, 1);
  g.fill(c.pants);
  g.roundRect(1, -18, 8, 13, 1);
  g.fill(c.pants);

  // Belt
  g.rect(-9, -20, 18, 3);
  g.fill(0x5d4037);

  // Shirt / torso
  g.roundRect(-10, -36, 20, 17, 2);
  g.fill(c.shirt);

  // Shirt detail (collar)
  g.moveTo(-3, -36);
  g.lineTo(0, -33);
  g.lineTo(3, -36);
  g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.4 });

  // Arms
  g.roundRect(-14, -34, 5, 14, 2);
  g.fill(c.shirt);
  g.roundRect(9, -34, 5, 14, 2);
  g.fill(c.shirt);

  // Hands
  g.circle(-11.5, -19, 3);
  g.fill(c.skin);
  g.circle(11.5, -19, 3);
  g.fill(c.skin);

  // Neck
  g.rect(-3, -40, 6, 5);
  g.fill(c.skin);

  // Head
  g.roundRect(-10, -54, 20, 16, 3);
  g.fill(c.skin);

  // Eyes
  g.circle(-4, -47, 1.5);
  g.fill(0x222222);
  g.circle(4, -47, 1.5);
  g.fill(0x222222);

  // Eye highlights
  g.circle(-3.5, -47.5, 0.5);
  g.fill(0xffffff);
  g.circle(4.5, -47.5, 0.5);
  g.fill(0xffffff);

  // Mouth
  g.moveTo(-2, -43);
  g.quadraticCurveTo(0, -41, 2, -43);
  g.stroke({ width: 1, color: 0x8b4513 });

  // Hair
  g.roundRect(-11, -58, 22, 10, 3);
  g.fill(c.hair);
  // Hair bangs
  g.roundRect(-11, -54, 6, 4, 1);
  g.fill(c.hair);

  container.addChild(g);

  // Name label
  const nameText = new Text({
    text: name,
    style: new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 8,
      fill: 0xffffff,
      align: 'center',
      dropShadow: {
        alpha: 1,
        blur: 0,
        distance: 1,
        color: 0x000000,
      },
    }),
  });
  nameText.anchor.set(0.5, 1);
  nameText.x = 0;
  nameText.y = -62;
  nameText.label = 'nameLabel';
  container.addChild(nameText);

  // Status indicator dot
  const statusDot = new Graphics();
  const statusColor = status === 'online' ? 0x4caf50 : status === 'busy' ? 0xff9800 : 0x9e9e9e;
  statusDot.circle(0, 0, 3);
  statusDot.fill(statusColor);
  statusDot.stroke({ width: 1, color: 0x000000, alpha: 0.5 });
  statusDot.x = nameText.x + (nameText.width / 2) + 6;
  statusDot.y = -66;
  statusDot.label = 'statusDot';
  container.addChild(statusDot);

  return container;
}

/**
 * Create a selection indicator (pulsing circle under agent).
 */
export function createSelectionRing(): Graphics {
  const ring = new Graphics();
  ring.ellipse(0, 0, 16, 8);
  ring.stroke({ width: 2, color: 0x00e5ff, alpha: 0.8 });
  ring.label = 'selectionRing';
  return ring;
}
