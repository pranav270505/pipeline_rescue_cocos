import { _decorator, Component, Node, Enum, EventTouch, tween, Vec3, Graphics, Color } from 'cc';
import { PipeGame } from './PipeGame';

const { ccclass, property } = _decorator;

export enum TileType {
    START = 0,
    GOAL = 1,
    STRAIGHT = 2,
    ELBOW = 3
}

Enum(TileType);

@ccclass('PipeTile')
export class PipeTile extends Component {

    @property({ type: TileType, tooltip: 'Type of the pipe tile' })
    public tileType: TileType = TileType.STRAIGHT;

    @property({ tooltip: 'Initial rotation index (0, 90, 180, 270) in degrees' })
    public currentRotation: number = 0;

    @property({ tooltip: 'If true, player cannot rotate this tile (usually Start and Goal)' })
    public isFixed: boolean = false;

    @property({ type: PipeGame, tooltip: 'Reference to the main game controller' })
    public gameManager: PipeGame = null!;

    public gridX: number = 0;
    public gridY: number = 0;
    public connected: boolean = false;

    // Sprite nodes (Optional fallbacks)
    @property({ type: Node, tooltip: 'Optional: child node containing sprite graphics' })
    public pipeGraphic: Node = null!;

    @property({ type: Node, tooltip: 'Optional: glow node indicating active water flow' })
    public waterFlowGraphic: Node = null!;

    private _isRotating: boolean = false;
    private _graphics: Graphics = null!;

    onLoad() {
        // Ensure Graphics component exists
        this._graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
        
        // Sync visual rotation
        this.node.angle = -this.currentRotation;

        if (!this.isFixed) {
            this.node.on(Node.EventType.TOUCH_END, this.onTileTapped, this);
        }
        
        this.drawTile();
    }

    private onTileTapped(event: EventTouch) {
        if (this._isRotating || (this.gameManager && !this.gameManager.isGameActive)) return;
        this.rotate();
    }

    public rotate() {
        if (this.isFixed) return;
        
        this._isRotating = true;
        this.currentRotation = (this.currentRotation + 90) % 360;

        // Animate 90 degree clockwise rotation
        tween(this.node)
            .to(0.2, { angle: -this.currentRotation }, { easing: 'sineOut' })
            .call(() => {
                this._isRotating = false;
                if (this.gameManager) {
                    this.gameManager.onTileRotated(this);
                }
            })
            .start();
    }

    // [Top, Right, Bottom, Left] connections
    public getConnections(): boolean[] {
        const conn = [false, false, false, false];

        if (this.tileType === TileType.START) {
            conn[1] = true; // Right
        } else if (this.tileType === TileType.GOAL) {
            conn[3] = true; // Left
        } else if (this.tileType === TileType.STRAIGHT) {
            if (this.currentRotation === 0 || this.currentRotation === 180) {
                conn[1] = true; conn[3] = true; // Right, Left
            } else {
                conn[0] = true; conn[2] = true; // Top, Bottom
            }
        } else if (this.tileType === TileType.ELBOW) {
            if (this.currentRotation === 0) {
                conn[3] = true; conn[0] = true; // Left, Top
            } else if (this.currentRotation === 90) {
                conn[0] = true; conn[1] = true; // Top, Right
            } else if (this.currentRotation === 180) {
                conn[1] = true; conn[2] = true; // Right, Bottom
            } else if (this.currentRotation === 270) {
                conn[2] = true; conn[3] = true; // Bottom, Left
            }
        }

        return conn;
    }

    public setConnected(connected: boolean) {
        this.connected = connected;
        this.updateVisualState();
    }

    private updateVisualState() {
        if (this.waterFlowGraphic) {
            this.waterFlowGraphic.active = this.connected;
        }
        
        if (this.pipeGraphic) {
            const targetScale = this.connected ? new Vec3(1.05, 1.05, 1) : new Vec3(1, 1, 1);
            tween(this.pipeGraphic)
                .to(0.2, { scale: targetScale })
                .start();
        }

        this.drawTile();
    }

    // --- Vector Pipe Drawing in 100x100 Coordinate Space ---
    private drawTile() {
        if (!this._graphics) return;

        this._graphics.clear();

        // 1. Draw Tile Background Card (Rounded square container)
        this._graphics.lineWidth = 1.5;
        this._graphics.fillColor = new Color(13, 23, 43, 255); // Solid dark blue-grey tile background
        
        if (this.tileType === TileType.START) {
            this._graphics.strokeColor = new Color(0, 242, 254, 180); // Neon Cyan for Start Tile
        } else if (this.tileType === TileType.GOAL) {
            this._graphics.strokeColor = new Color(255, 215, 0, 180); // Gold for Goal Tile
        } else {
            this._graphics.strokeColor = new Color(255, 255, 255, 15); // Subtle grey border for normal tiles
        }
        
        // Size 98x98 leaves a perfect 2px padding inside the 100x100 node boundaries
        this._graphics.roundRect(-49, -49, 98, 98, 12);
        this._graphics.fill();
        this._graphics.stroke();

        // 2. Draw Layer 1: Pipe background contour (18px)
        const outerColor = this.connected ? new Color(13, 67, 97, 255) : new Color(46, 62, 86, 255);
        this.drawPipePath(18, outerColor);

        // 3. Draw Layer 2: Pipe inner core (10px)
        const innerColor = this.connected ? new Color(9, 44, 64, 255) : new Color(18, 30, 48, 255);
        this.drawPipePath(10, innerColor);

        // 4. Draw Layer 3: Water flow path (6px, cyan)
        if (this.connected) {
            const waterColor = new Color(0, 242, 254, 255);
            this.drawPipePath(6, waterColor);
        }
    }

    private drawPipePath(width: number, color: Color) {
        this._graphics.lineWidth = width;
        this._graphics.strokeColor = color;
        this._graphics.fillColor = color;

        const half = 50; // Coordinates span from -50 to +50

        if (this.tileType === TileType.STRAIGHT) {
            // Horizontal line passing through center (rotated programmatically for vertical)
            this._graphics.moveTo(-half, 0);
            this._graphics.lineTo(half, 0);
            this._graphics.stroke();
        } 
        else if (this.tileType === TileType.ELBOW) {
            // Draw a perfect 90-degree bend connecting Left (-50, 0) and Top (0, 50)
            // Control point at (0,0) centers the curve beautifully without overflowing neighbors
            this._graphics.moveTo(-half, 0);
            this._graphics.quadraticCurveTo(0, 0, 0, half);
            this._graphics.stroke();
        } 
        else if (this.tileType === TileType.START) {
            // Pipe entering from Left, ending at source emitter
            this._graphics.moveTo(-half, 0);
            this._graphics.lineTo(30, 0);
            this._graphics.stroke();

            // Source/emitter tank body
            const r = width === 6 ? 6 : (width === 10 ? 12 : 16);
            this._graphics.circle(-30, 0, r);
            this._graphics.fill();

            // Core glow highlight
            if (width === 6) {
                this._graphics.fillColor = new Color(0, 242, 254, 255);
                this._graphics.circle(-30, 0, 7);
                this._graphics.fill();
            }
        } 
        else if (this.tileType === TileType.GOAL) {
            // Pipe entering from Left, entering cage on the right
            this._graphics.moveTo(-half, 0);
            this._graphics.lineTo(15, 0);
            this._graphics.stroke();

            // Draw cage container
            const strokeW = width === 6 ? 2 : (width === 10 ? 4 : 6);
            this._graphics.lineWidth = strokeW;
            this._graphics.rect(15, -20, 30, 40);
            this._graphics.stroke();

            // Draw cage vertical bars
            this._graphics.lineWidth = 1.5;
            this._graphics.moveTo(22.5, -20);
            this._graphics.lineTo(22.5, 20);
            this._graphics.moveTo(30, -20);
            this._graphics.lineTo(30, 20);
            this._graphics.moveTo(37.5, -20);
            this._graphics.lineTo(37.5, 20);
            this._graphics.stroke();

            // Diver target inside cage
            if (width === 6) {
                this._graphics.fillColor = new Color(255, 215, 0, 255); // Gold
                this._graphics.circle(30, 0, 6);
                this._graphics.fill();
            } else if (width === 18) {
                this._graphics.fillColor = new Color(127, 140, 141, 255); // Grey
                this._graphics.circle(30, 0, 6);
                this._graphics.fill();
            }
        }
    }
}
