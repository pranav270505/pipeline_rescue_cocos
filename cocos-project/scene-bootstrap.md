# Cocos Creator scene bootstrap guide

This guide details how to set up the **Pipe Rescue** scene in Cocos Creator 3.x with **zero visual assembly**. The scripts automatically construct, position, style, and bind the entire UI layout and pipe grid at runtime.

---

## 1. Quick Setup Steps (Zero-Assemble)

1. Open Cocos Creator 3.x and load your project.
2. In the **Assets** panel, create a folder named `scripts` under `assets/`.
3. Drop the two TypeScript files into it:
   - [PipeTile.ts](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/pipe-rescue-playable-ad/cocos-project/assets/scripts/PipeTile.ts)
   - [PipeGame.ts](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/pipe-rescue-playable-ad/cocos-project/assets/scripts/PipeGame.ts)
4. In the **Scene** window (or file menu), open or create a new **2D scene** (e.g. `scene.scene`). By default, Cocos Creator creates a scene containing:
   - `Canvas` (The UI Root Node)
     - `Camera` (The UI Rendering Camera Node)
5. Select the **`Canvas`** node in the **Hierarchy** panel.
6. In the **Inspector** panel on the right, click **Add Component**, search for **`PipeGame`**, and add it. 
   - Leave all properties (labels, nodes, panels, tiles array) **empty**.
7. Click the **Play / Preview** button at the top of the Cocos Creator editor.
8. The game will automatically boot, construct the backgrounds, title tags, stats labels, overlays, restart buttons, instantiate the 16 pipe nodes, and render their vector graphics via the native `Graphics` canvas rendering pipeline!

---

## 2. Under the Hood Wiring

The scene is wired dynamically in [PipeGame.ts](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/pipe-rescue-playable-ad/cocos-project/assets/scripts/PipeGame.ts)'s `onLoad()` event:
- **Canvas Layout Sync**: Resizes the root to `720x1280` design resolution.
- **Deep Blue Background**: Instantiates a node named `Background` with a solid vector block covering the Canvas area.
- **Title & Subtitle**: Automatically creates the header labels with custom HSL-equivalent styling and sets them in position.
- **Dynamic 4x4 Grid**: Places a central parent grid container at `(0, -60)` relative to Canvas center, then instantiates 16 child nodes configured with correct `PipeTile` script settings (tile type, initial rotations, fixed anchors).
- **Interactive Tapping**: Automatically maps `Node.EventType.TOUCH_END` in [PipeTile.ts](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/pipe-rescue-playable-ad/cocos-project/assets/scripts/PipeTile.ts) to call the visual tween rotation, update game states, and run the BFS water connection trace.
- **Overlay Modals**: Spawns semi-transparent overlays for Victory and Failure states, embedding CTA and Replay buttons, and programmatically binds their click events.
- **Vector Rendering**: Rather than needing texture assets, [PipeTile.ts](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/pipe-rescue-playable-ad/cocos-project/assets/scripts/PipeTile.ts) adds a `Graphics` component at runtime to draw the metallic pipe hulls, inner paths, and glowing cyan fluid streams dynamically.
