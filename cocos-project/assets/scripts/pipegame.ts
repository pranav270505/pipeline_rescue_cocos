import { _decorator, Component, Node, Label, Button, AudioSource, log, Graphics, Color, UITransform, Vec3, Layers, tween } from 'cc';
import { PipeTile, TileType } from './PipeTile';

const { ccclass, property } = _decorator;

@ccclass('PipeGame')
export class PipeGame extends Component {

    // --- Editor Inspector Properties (Optional Fallbacks) ---
    @property({ type: Label, tooltip: 'Optional: Label displaying moves remaining' })
    public movesLabel: Label = null;

    @property({ type: Label, tooltip: 'Optional: Label displaying flow rate progress' })
    public flowLabel: Label = null;

    @property({ type: Node, tooltip: 'Optional: Panel overlay shown on success' })
    public victoryPanel: Node = null;

    @property({ type: Node, tooltip: 'Optional: Panel overlay shown on out of moves' })
    public failurePanel: Node = null;

    @property({ type: Button, tooltip: 'Optional: Call to Action Button in overlays' })
    public ctaButtonWin: Button = null;

    @property({ type: Button, tooltip: 'Optional: Call to Action Button in failure panel' })
    public ctaButtonFail: Button = null;

    @property({ type: Button, tooltip: 'Optional: Restart level button' })
    public restartButton: Button = null;

    @property({ type: AudioSource, tooltip: 'Optional: sound source for game sfx' })
    public audioSource: AudioSource = null;

    @property({ type: [PipeTile], tooltip: 'Optional: All 16 tiles arranged in row-by-row layout (Row 0, then Row 1...)' })
    public tiles: PipeTile[] = [];

    // --- Game States ---
    public isGameActive: boolean = true;
    public movesRemaining: number = 15;

    // --- Runtime Programmatic UI Nodes (Fallback References) ---
    private _programmaticMovesLabel: Label = null!;
    private _programmaticFlowLabel: Label = null!;
    private _programmaticVictoryPanel: Node = null!;
    private _programmaticFailurePanel: Node = null!;

    private readonly GRID_SIZE: number = 4;
    private _grid: PipeTile[][] = [];

    // Direction Offsets: 0 = Top, 1 = Right, 2 = Bottom, 3 = Left
    private readonly DX = [0, 1, 0, -1];
    private readonly DY = [-1, 0, 1, 0];

    onLoad() {
        // If properties are unassigned, build the entire scene dynamically
        if (this.tiles.length === 0) {
            log("No pre-configured tiles found. Auto-generating game scene programmatically...");
            this.buildSceneProgrammatically();
        }
    }

    start() {
        this.initializeBoard();
    }

    public initializeBoard() {
        this.isGameActive = true;
        this.movesRemaining = 15;
        
        // Reset and hide overlay panels
        if (this.victoryPanel) this.victoryPanel.active = false;
        if (this._programmaticVictoryPanel) this._programmaticVictoryPanel.active = false;
        if (this.failurePanel) this.failurePanel.active = false;
        if (this._programmaticFailurePanel) this._programmaticFailurePanel.active = false;

        // Clear and rebuild internal 2D grid pointers
        this._grid = [];
        for (let y = 0; y < this.GRID_SIZE; y++) {
            this._grid.push([]);
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const index = y * this.GRID_SIZE + x;
                const tile = this.tiles[index];
                if (tile) {
                    tile.gridX = x;
                    tile.gridY = y;
                    tile.gameManager = this;
                    this._grid[y].push(tile);
                    
                    // Reset single tile rotation states to initial config
                    tile.node.angle = -tile.currentRotation;
                    tile.setConnected(false);
                } else {
                    log(`Warning: Missing PipeTile configuration at index ${index}`);
                }
            }
        }

        this.updateUI();
        this.recalculateConnections();
    }

    public onTileRotated(tile: PipeTile) {
        if (!this.isGameActive) return;

        this.playSfx('tap');
        this.movesRemaining--;
        this.updateUI();
        
        this.recalculateConnections();

        // Check game end conditions
        const goalTile = this.getGoalTile();
        if (goalTile && goalTile.connected) {
            this.endGame(true);
        } else if (this.movesRemaining <= 0) {
            this.endGame(false);
        }
    }

    // Runs a Breadth-First Search (BFS) starting from the START tile
    public recalculateConnections() {
        // 1. Reset connectivity states
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const tile = this._grid[y]?.[x];
                if (tile) tile.setConnected(false);
            }
        }

        // 2. Identify Start Tile (fixed at 0, 1)
        const startTile = this._grid[1]?.[0];
        if (!startTile || startTile.tileType !== TileType.START) {
            log("Error: Start tile not found at coordinates (0, 1)");
            return;
        }

        startTile.setConnected(true);
        
        // 3. BFS Traversal Queue
        const queue: PipeTile[] = [startTile];
        const visited: boolean[][] = Array(this.GRID_SIZE).fill(null).map(() => Array(this.GRID_SIZE).fill(false));
        visited[1][0] = true;

        while (queue.length > 0) {
            const curr = queue.shift()!;
            const currConns = curr.getConnections();

            for (let dir = 0; dir < 4; dir++) {
                if (currConns[dir]) {
                    const nx = curr.gridX + this.DX[dir];
                    const ny = curr.gridY + this.DY[dir];

                    // Check bounds
                    if (nx >= 0 && nx < this.GRID_SIZE && ny >= 0 && ny < this.GRID_SIZE) {
                        const neighbor = this._grid[ny]?.[nx];
                        if (neighbor && !visited[ny][nx]) {
                            const oppositeDir = (dir + 2) % 4;
                            const neighConns = neighbor.getConnections();

                            // Bidirectional matching check
                            if (neighConns[oppositeDir]) {
                                neighbor.setConnected(true);
                                visited[ny][nx] = true;
                                queue.push(neighbor);
                            }
                        }
                    }
                }
            }
        }

        this.updateFlowProgress();
    }

    private updateFlowProgress() {
        const start = this._grid[1]?.[0];
        const mid1 = this._grid[1]?.[1];
        const mid2 = this._grid[2]?.[1];
        const mid3 = this._grid[2]?.[2];
        const goal = this._grid[2]?.[3];

        const targetPath = [start, mid1, mid2, mid3, goal];
        let connectedCount = 0;
        
        targetPath.forEach(tile => {
            if (tile && tile.connected) connectedCount++;
        });

        const percent = Math.round((connectedCount / targetPath.length) * 100);
        if (this.flowLabel) {
            this.flowLabel.string = `${percent}%`;
        } else if (this._programmaticFlowLabel) {
            this._programmaticFlowLabel.string = `${percent}%`;
        }
    }

    private getGoalTile(): PipeTile | null {
        // Goal tile is fixed at x=3, y=2 in 4x4 setup
        return this._grid[2]?.[3] || null;
    }

    private endGame(isWin: boolean) {
        this.isGameActive = false;

        // Short visual delay to match UI transition feel
        this.scheduleOnce(() => {
            if (isWin) {
                this.playSfx('win');
                if (this.victoryPanel) this.victoryPanel.active = true;
                else if (this._programmaticVictoryPanel) this._programmaticVictoryPanel.active = true;
            } else {
                this.playSfx('fail');
                if (this.failurePanel) this.failurePanel.active = true;
                else if (this._programmaticFailurePanel) this._programmaticFailurePanel.active = true;
            }
        }, 0.55);
    }

    private updateUI() {
        if (this.movesLabel) {
            this.movesLabel.string = this.movesRemaining.toString();
        } else if (this._programmaticMovesLabel) {
            this._programmaticMovesLabel.string = this.movesRemaining.toString();
        }
    }

    // CTA Event Handlers
    public onCTAButtonClicked() {
        log("Redirecting user to app store download link...");
        // Ad network call: mraid.open("app_store_url")
    }

    public onRestartButtonClicked() {
        this.initializeBoard();
    }

    private playSfx(type: 'tap' | 'win' | 'fail') {
        if (this.audioSource) {
            log(`SFX played: ${type}`);
        } else {
            log(`Console SFX Fallback: ${type}`);
        }
    }

    // --- Programmatic Click Listener Helper (Touch events with Scale Tween) ---
    private makeNodeClickable(node: Node, callback: () => void, targetScale: number = 0.94) {
        // Touch Start: Scale down to simulate press feedback
        node.on(Node.EventType.TOUCH_START, () => {
            tween(node)
                .to(0.08, { scale: new Vec3(targetScale, targetScale, 1) })
                .start();
        }, this);

        // Touch End: Trigger action and scale back up
        node.on(Node.EventType.TOUCH_END, () => {
            tween(node)
                .to(0.08, { scale: new Vec3(1, 1, 1) })
                .call(() => {
                    callback.call(this);
                })
                .start();
        }, this);

        // Touch Cancel: Restore scale if user drags away without releasing
        node.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(node)
                .to(0.08, { scale: new Vec3(1, 1, 1) })
                .start();
        }, this);
    }

    // --- Complete Scene Auto-Construction (Programmatic Setup) ---
    private buildSceneProgrammatically() {
        const UI_LAYER = Layers.Enum.UI_2D;

        // 1. Ensure Canvas node structure is 720x1280
        const canvasTransform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        canvasTransform.setContentSize(720, 1280);
        this.node.layer = UI_LAYER;

        // 2. Draw a deep radial gradient styled background
        const bgNode = new Node("Background");
        bgNode.layer = UI_LAYER;
        this.node.addChild(bgNode);
        const bgTransform = bgNode.addComponent(UITransform);
        bgTransform.setContentSize(720, 1280);
        const bgGraphics = bgNode.addComponent(Graphics);
        bgGraphics.fillColor = new Color(7, 15, 30, 255); // Dark deep ocean blue
        bgGraphics.rect(-360, -640, 720, 1280);
        bgGraphics.fill();

        // 3. Create Game Title (Adjusted Y to prevent overlaps)
        const titleNode = new Node("TitleLabel");
        titleNode.layer = UI_LAYER;
        this.node.addChild(titleNode);
        titleNode.setPosition(0, 410, 0);
        const titleTransform = titleNode.addComponent(UITransform);
        titleTransform.setContentSize(600, 80);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = "PIPE RESCUE!";
        titleLabel.fontSize = 42;
        titleLabel.lineHeight = 48;
        titleLabel.color = new Color(0, 242, 254, 255); // Neon Cyan

        // Subtitle (Adjusted Y)
        const subNode = new Node("SubtitleLabel");
        subNode.layer = UI_LAYER;
        this.node.addChild(subNode);
        subNode.setPosition(0, 350, 0);
        const subTransform = subNode.addComponent(UITransform);
        subTransform.setContentSize(600, 50);
        const subLabel = subNode.addComponent(Label);
        subLabel.string = "Connect the water source to rescue the diver!";
        subLabel.fontSize = 18;
        subLabel.lineHeight = 22;
        subLabel.color = new Color(138, 180, 248, 255); // Soft blue

        // 4. Create Premium Stats Cards (Moves Left & Flow Rate panels)
        const statsNode = new Node("StatsRow");
        statsNode.layer = UI_LAYER;
        this.node.addChild(statsNode);
        statsNode.setPosition(0, 240, 0);

        // -- Moves Left Card --
        const movesCardNode = new Node("MovesCard");
        movesCardNode.layer = UI_LAYER;
        statsNode.addChild(movesCardNode);
        movesCardNode.setPosition(-130, 0, 0);
        movesCardNode.addComponent(UITransform).setContentSize(220, 80);
        
        const mCardGraphics = movesCardNode.addComponent(Graphics);
        mCardGraphics.fillColor = new Color(13, 27, 54, 255);
        mCardGraphics.strokeColor = new Color(0, 242, 254, 80);
        mCardGraphics.lineWidth = 1.5;
        mCardGraphics.roundRect(-110, -40, 220, 80, 10);
        mCardGraphics.fill();
        mCardGraphics.stroke();

        // Card Title "MOVES LEFT"
        const mLabelTitleNode = new Node("LabelTitle");
        mLabelTitleNode.layer = UI_LAYER;
        movesCardNode.addChild(mLabelTitleNode);
        mLabelTitleNode.setPosition(0, 16, 0);
        mLabelTitleNode.addComponent(UITransform).setContentSize(180, 20);
        const mTitleL = mLabelTitleNode.addComponent(Label);
        mTitleL.string = "MOVES LEFT";
        mTitleL.fontSize = 11;
        mTitleL.color = new Color(138, 180, 248, 255);

        // Card Value (Remaining count)
        const mLabelValueNode = new Node("LabelValue");
        mLabelValueNode.layer = UI_LAYER;
        movesCardNode.addChild(mLabelValueNode);
        mLabelValueNode.setPosition(0, -14, 0);
        mLabelValueNode.addComponent(UITransform).setContentSize(180, 32);
        this._programmaticMovesLabel = mLabelValueNode.addComponent(Label);
        this._programmaticMovesLabel.string = "15";
        this._programmaticMovesLabel.fontSize = 28;
        this._programmaticMovesLabel.color = Color.WHITE;

        // -- Flow Rate Card --
        const flowCardNode = new Node("FlowCard");
        flowCardNode.layer = UI_LAYER;
        statsNode.addChild(flowCardNode);
        flowCardNode.setPosition(130, 0, 0);
        flowCardNode.addComponent(UITransform).setContentSize(220, 80);
        
        const fCardGraphics = flowCardNode.addComponent(Graphics);
        fCardGraphics.fillColor = new Color(13, 27, 54, 255);
        fCardGraphics.strokeColor = new Color(0, 242, 254, 80);
        fCardGraphics.lineWidth = 1.5;
        fCardGraphics.roundRect(-110, -40, 220, 80, 10);
        fCardGraphics.fill();
        fCardGraphics.stroke();

        // Card Title "FLOW RATE"
        const fLabelTitleNode = new Node("LabelTitle");
        fLabelTitleNode.layer = UI_LAYER;
        flowCardNode.addChild(fLabelTitleNode);
        fLabelTitleNode.setPosition(0, 16, 0);
        fLabelTitleNode.addComponent(UITransform).setContentSize(180, 20);
        const fTitleL = fLabelTitleNode.addComponent(Label);
        fTitleL.string = "FLOW RATE";
        fTitleL.fontSize = 11;
        fTitleL.color = new Color(138, 180, 248, 255);

        // Card Value (Percentage count)
        const fLabelValueNode = new Node("LabelValue");
        fLabelValueNode.layer = UI_LAYER;
        flowCardNode.addChild(fLabelValueNode);
        fLabelValueNode.setPosition(0, -14, 0);
        fLabelValueNode.addComponent(UITransform).setContentSize(180, 32);
        this._programmaticFlowLabel = fLabelValueNode.addComponent(Label);
        this._programmaticFlowLabel.string = "0%";
        this._programmaticFlowLabel.fontSize = 28;
        this._programmaticFlowLabel.color = new Color(0, 242, 254, 255);

        // 5. Create 4x4 Grid and Tiles (Compact 100x100 tiles spacing to prevent overlaps)
        const gridNode = new Node("GridContainer");
        gridNode.layer = UI_LAYER;
        this.node.addChild(gridNode);
        gridNode.setPosition(0, -50, 0); // Repositioned
        gridNode.addComponent(UITransform).setContentSize(440, 440); // 440x440 grid
        
        // Draw grid background box
        const gridGraphics = gridNode.addComponent(Graphics);
        gridGraphics.fillColor = new Color(13, 27, 54, 180); // Semi-transparent card
        gridGraphics.strokeColor = new Color(0, 242, 254, 50);
        gridGraphics.lineWidth = 2;
        gridGraphics.roundRect(-220, -220, 440, 440, 16);
        gridGraphics.fill();
        gridGraphics.stroke();

        // 16 Tile Configuration Matrix (Solvable Scramble Setup)
        const tileConfigs = [
            // Row 0
            { type: TileType.ELBOW, rot: 90, fixed: false },
            { type: TileType.STRAIGHT, rot: 90, fixed: false },
            { type: TileType.STRAIGHT, rot: 0, fixed: false },
            { type: TileType.ELBOW, rot: 180, fixed: false },
            // Row 1
            { type: TileType.START, rot: 0, fixed: true },
            { type: TileType.STRAIGHT, rot: 90, fixed: false }, // Correct: 0
            { type: TileType.ELBOW, rot: 0, fixed: false },      // Correct: 270
            { type: TileType.ELBOW, rot: 270, fixed: false },
            // Row 2
            { type: TileType.ELBOW, rot: 90, fixed: false },
            { type: TileType.STRAIGHT, rot: 90, fixed: false },
            { type: TileType.ELBOW, rot: 180, fixed: false },     // Correct: 90
            { type: TileType.GOAL, rot: 0, fixed: true },
            // Row 3
            { type: TileType.STRAIGHT, rot: 90, fixed: false },
            { type: TileType.ELBOW, rot: 270, fixed: false },
            { type: TileType.STRAIGHT, rot: 0, fixed: false },
            { type: TileType.ELBOW, rot: 0, fixed: false }
        ];

        this.tiles = [];

        // Spawn 16 Tile Nodes with 110px Pitch Spacing (Tile size 100x100)
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const configIdx = y * this.GRID_SIZE + x;
                const config = tileConfigs[configIdx];

                const tileNode = new Node(`Tile_${x}_${y}`);
                tileNode.layer = UI_LAYER;
                gridNode.addChild(tileNode);

                // Math for grid cells layouts
                const px = (x - 1.5) * 110;
                const py = (1.5 - y) * 110;
                tileNode.setPosition(px, py, 0);

                const tileTransform = tileNode.addComponent(UITransform);
                tileTransform.setContentSize(100, 100);

                // Attach custom PipeTile component
                const pipeTile = tileNode.addComponent(PipeTile);
                pipeTile.tileType = config.type;
                pipeTile.currentRotation = config.rot;
                pipeTile.isFixed = config.fixed;
                pipeTile.gameManager = this;

                this.tiles.push(pipeTile);
            }
        }

        // 6. Create Bottom Restart button (Adjusted Y coordinate & bulletproof touch handlers)
        const restartNode = new Node("RestartButton");
        restartNode.layer = UI_LAYER;
        this.node.addChild(restartNode);
        restartNode.setPosition(0, -340, 0); // Positioned nicely below grid
        restartNode.addComponent(UITransform).setContentSize(240, 54);

        const rGraphics = restartNode.addComponent(Graphics);
        rGraphics.fillColor = new Color(0, 242, 254, 220); // Cyan button
        rGraphics.roundRect(-120, -27, 240, 54, 27);
        rGraphics.fill();

        // Wire touch event click listener directly
        this.makeNodeClickable(restartNode, this.onRestartButtonClicked);

        const restartLabelNode = new Node("Label");
        restartLabelNode.layer = UI_LAYER;
        restartNode.addChild(restartLabelNode);
        restartLabelNode.addComponent(UITransform).setContentSize(200, 40);
        const rLabel = restartLabelNode.addComponent(Label);
        rLabel.string = "RESTART LEVEL";
        rLabel.fontSize = 18;
        rLabel.color = new Color(3, 8, 18, 255); // Dark text on cyan

        // 7. Create Victory Panel Overlay
        this._programmaticVictoryPanel = new Node("VictoryPanel");
        this._programmaticVictoryPanel.layer = UI_LAYER;
        this.node.addChild(this._programmaticVictoryPanel);
        this._programmaticVictoryPanel.setPosition(0, 0, 0);
        this._programmaticVictoryPanel.addComponent(UITransform).setContentSize(720, 1280);
        this._programmaticVictoryPanel.active = false;

        const vGraphics = this._programmaticVictoryPanel.addComponent(Graphics);
        vGraphics.fillColor = new Color(4, 9, 18, 230); // Dark overlay
        vGraphics.rect(-360, -640, 720, 1280);
        vGraphics.fill();

        // Victory Title
        const vTitleNode = new Node("Title");
        vTitleNode.layer = UI_LAYER;
        this._programmaticVictoryPanel.addChild(vTitleNode);
        vTitleNode.setPosition(0, 180, 0);
        vTitleNode.addComponent(UITransform).setContentSize(600, 80);
        const vTitle = vTitleNode.addComponent(Label);
        vTitle.string = "RESCUE SUCCESSFUL!";
        vTitle.fontSize = 42;
        vTitle.color = new Color(255, 215, 0, 255); // Golden

        // Victory Sub
        const vSubNode = new Node("Sub");
        vSubNode.layer = UI_LAYER;
        this._programmaticVictoryPanel.addChild(vSubNode);
        vSubNode.setPosition(0, 90, 0);
        vSubNode.addComponent(UITransform).setContentSize(600, 60);
        const vSub = vSubNode.addComponent(Label);
        vSub.string = "Water is flowing and the diver is safe!";
        vSub.fontSize = 22;
        vSub.color = Color.WHITE;

        // Victory CTA Button
        const vCtaNode = new Node("CtaButton");
        vCtaNode.layer = UI_LAYER;
        this._programmaticVictoryPanel.addChild(vCtaNode);
        vCtaNode.setPosition(0, -60, 0);
        vCtaNode.addComponent(UITransform).setContentSize(340, 70);
        const vCtaGraphics = vCtaNode.addComponent(Graphics);
        vCtaGraphics.fillColor = new Color(255, 215, 0, 255); // Golden
        vCtaGraphics.roundRect(-170, -35, 340, 70, 35);
        vCtaGraphics.fill();
        this.makeNodeClickable(vCtaNode, this.onCTAButtonClicked);

        const vCtaLabelNode = new Node("Label");
        vCtaLabelNode.layer = UI_LAYER;
        vCtaNode.addChild(vCtaLabelNode);
        vCtaLabelNode.addComponent(UITransform).setContentSize(300, 50);
        const vCtaLabel = vCtaLabelNode.addComponent(Label);
        vCtaLabel.string = "PLAY MORE LEVELS";
        vCtaLabel.fontSize = 24;
        vCtaLabel.color = new Color(3, 8, 18, 255);

        // Victory Replay Button
        const vReplayNode = new Node("ReplayButton");
        vReplayNode.layer = UI_LAYER;
        this._programmaticVictoryPanel.addChild(vReplayNode);
        vReplayNode.setPosition(0, -180, 0);
        vReplayNode.addComponent(UITransform).setContentSize(200, 50);
        const vReplayGraphics = vReplayNode.addComponent(Graphics);
        vReplayGraphics.strokeColor = new Color(255, 255, 255, 120);
        vReplayGraphics.lineWidth = 2;
        vReplayGraphics.roundRect(-100, -25, 200, 50, 25);
        vReplayGraphics.stroke();
        this.makeNodeClickable(vReplayNode, () => {
            this._programmaticVictoryPanel.active = false;
            this.initializeBoard();
        });

        const vReplayLabelNode = new Node("Label");
        vReplayLabelNode.layer = UI_LAYER;
        vReplayNode.addChild(vReplayLabelNode);
        const vRepLabel = vReplayLabelNode.addComponent(Label);
        vRepLabel.string = "REPLAY DEMO";
        vRepLabel.fontSize = 18;
        vRepLabel.color = Color.WHITE;

        // 8. Create Failure Panel Overlay
        this._programmaticFailurePanel = new Node("FailurePanel");
        this._programmaticFailurePanel.layer = UI_LAYER;
        this.node.addChild(this._programmaticFailurePanel);
        this._programmaticFailurePanel.setPosition(0, 0, 0);
        this._programmaticFailurePanel.addComponent(UITransform).setContentSize(720, 1280);
        this._programmaticFailurePanel.active = false;

        const fGraphics = this._programmaticFailurePanel.addComponent(Graphics);
        fGraphics.fillColor = new Color(4, 9, 18, 230);
        fGraphics.rect(-360, -640, 720, 1280);
        fGraphics.fill();

        // Failure Title
        const fTitleNode = new Node("Title");
        fTitleNode.layer = UI_LAYER;
        this._programmaticFailurePanel.addChild(fTitleNode);
        fTitleNode.setPosition(0, 180, 0);
        fTitleNode.addComponent(UITransform).setContentSize(600, 80);
        const fTitle = fTitleNode.addComponent(Label);
        fTitle.string = "OUT OF MOVES!";
        fTitle.fontSize = 42;
        fTitle.color = new Color(255, 51, 102, 255); // Red/Rose

        // Failure Sub
        const fSubNode = new Node("Sub");
        fSubNode.layer = UI_LAYER;
        this._programmaticFailurePanel.addChild(fSubNode);
        fSubNode.setPosition(0, 90, 0);
        fSubNode.addComponent(UITransform).setContentSize(600, 60);
        const fSub = fSubNode.addComponent(Label);
        fSub.string = "Diver ran out of air. Try again!";
        fSub.fontSize = 22;
        fSub.color = Color.WHITE;

        // Failure Try Again Button
        const fCtaNode = new Node("CtaButton");
        fCtaNode.layer = UI_LAYER;
        this._programmaticFailurePanel.addChild(fCtaNode);
        fCtaNode.setPosition(0, -60, 0);
        fCtaNode.addComponent(UITransform).setContentSize(340, 70);
        const fCtaGraphics = fCtaNode.addComponent(Graphics);
        fCtaGraphics.fillColor = new Color(255, 51, 102, 255); // Red/Rose
        fCtaGraphics.roundRect(-170, -35, 340, 70, 35);
        fCtaGraphics.fill();
        this.makeNodeClickable(fCtaNode, () => {
            this._programmaticFailurePanel.active = false;
            this.initializeBoard();
        });

        const fCtaLabelNode = new Node("Label");
        fCtaLabelNode.layer = UI_LAYER;
        fCtaNode.addChild(fCtaLabelNode);
        fCtaLabelNode.addComponent(UITransform).setContentSize(300, 50);
        const fCtaLabel = fCtaLabelNode.addComponent(Label);
        fCtaLabel.string = "TRY AGAIN";
        fCtaLabel.fontSize = 24;
        fCtaLabel.color = Color.WHITE;
    }
}
