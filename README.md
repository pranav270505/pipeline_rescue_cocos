# Pipe Rescue - Playable Ad Prototype

A premium, 2D mobile-first playable ad built for web environments and easily portable to **Cocos Creator 3.x**. 

The game presents a 4x4 grid where players tap pipe tiles to rotate them and connect the Water Source (Start point, left-side fixed) to the Rescue Cage (Goal point, right-side fixed) before running out of moves. It features real-time pathfinding, neon cyan water-flow animations, custom touch scaling micro-animations, responsive portrait layouts, and a call-to-action transition.

---

## Project Structure

```text
pipe-rescue-playable-ad/
├── web-build/
│   └── index.html         # Standalone HTML5 single-file Playable Ad (fully playable)
├── cocos-project/
│   ├── scene_bootstrap.md # Guide explaining the zero-assembly scene boot
│   └── assets/
│       └── scripts/
│           ├── PipeTile.ts   # Cocos Creator 3.x Script (with vector tile and pipe Graphics)
│           └── PipeGame.ts   # Cocos Creator 3.x GameManager Script (with touch handler and auto-layout)
└── README.md              # Project documentation
```

---

## 1. Standalone Playable Ad (`web-build/`)

The standalone ad is contained entirely in `web-build/index.html`. It uses standard HTML5 Canvas/SVG rendering and Web Audio synthesis. This represents the "Web Export" of the playable ad and matches the industry-standard formats required by major mobile ad networks (Unity Ads, AppLovin, IronSource, Mintegral, etc.), which require a self-contained, single-file bundle.

### How to Run and Play
1. Locate the file: [index.html](C:\Users\Lenovo\OneDrive\Desktop\updated cocos ad.zip\updated cocos ad\web-build\index.html).
2. Simply **double-click** it to open it directly in any modern desktop or mobile web browser.
3. *Alternative (Command Line Server)*: Run `python -m http.server 8000` or `npx serve` in the `web-build` directory, then navigate to `http://localhost:8000`.

### Testing Portrait / Mobile Viewport
1. Open the page in **Chrome** or **Edge**.
2. Press `F12` (or right-click -> Inspect) to open Developer Tools.
3. Click the **Device Toolbar Icon** (looks like a phone/tablet) or press `Ctrl + Shift + M`.
4. Select a mobile device template (e.g., iPhone SE, Pixel 7) or set to "Responsive" and resize to a 9:16 layout. The game container will dynamically rescale and adapt its UI for premium mobile readability.

---

## 2. Cocos Creator Programmatic Setup (`cocos-project/`)

The scripts under `cocos-project/assets/scripts/` are configured for **Cocos Creator 3.x** using standard TypeScript, `@ccclass`, and Tween components.
We have implemented **runtime scene construction**, **discrete card-grid backgrounds**, **curved Bezier vector rendering**, and a **bulletproof touch engine** directly inside the scripts. This eliminates the need to import sprite assets, drag-and-drop items, or bind listener components in the editor interface!

### Key Architecture Features:
1. **Discrete Grid Tiles**: Each of the 16 grid cells is drawn as a rounded background card (`roundRect(-49, -49, 98, 98, 12)`) in [PipeTile.ts](C:\Users\Lenovo\OneDrive\Desktop\updated cocos ad.zip\updated cocos ad\cocos-project\assets\scripts\PipeTile.ts) with custom borders (Neon Cyan for Start, Gold for Goal, subtle Grey for regular). This creates a structured 4x4 card board.
2. **Overlapping Overrun Fixes**: Grid cells are sized at `100x100` and arranged at `110px` pitch spacing. Elbow pipe arcs are drawn as Bezier curves via `quadraticCurveTo(0, 0, 0, 50)` instead of angular circles, preventing visual overlaps with adjacent cells.
3. **Structured Stats Cards**: Moves Left and Flow Rate labels are styled inside rounded graphics containers with secondary headers to prevent clipping.
4. **Programmatic Touch Input Engine**: Rather than relying on standard editor `Button` components (which require transition sprite setups to capture inputs), [PipeGame.ts](C:\Users\Lenovo\OneDrive\Desktop\updated cocos ad.zip\updated cocos ad\cocos-project\assets\scripts\PipeGame.ts) binds direct `TOUCH_START`, `TOUCH_END`, and `TOUCH_CANCEL` handlers to all buttons:
   - Pressing down scales the button down to **`94%`** via a tween.
   - Releasing scales it back to `100%` and triggers the action.
   - This fixes any unresponsive click issues and provides click feedback.

### Zero-Assembly Scene Boot:
1. Open a new **empty 2D project** in Cocos Creator 3.x.
2. Place the [PipeTile.ts](C:\Users\Lenovo\OneDrive\Desktop\updated cocos ad.zip\updated cocos ad\cocos-project\assets\scripts\PipeTile.ts) and [PipeGame.ts](C:\Users\Lenovo\OneDrive\Desktop\updated cocos ad.zip\updated cocos ad\cocos-project\assets\scripts\PipeGame.ts) files into your assets scripts folder.
3. Select the **`Canvas`** node in the scene tree.
4. Add the **`PipeGame`** script component to the Canvas node in the Inspector panel. Leave all inspector properties blank.
5. Click **Play / Preview** in Cocos Creator. The script will automatically instantiate the entire node hierarchy (Header, Stats Cards, Grid, 16 Tile Nodes, overlays) and draw the vector tiles dynamically at runtime!

For detailed instructions and custom configurations, see [scene_bootstrap.md](C:\Users\Lenovo\OneDrive\Desktop\updated cocos ad.zip\updated cocos ad\cocos-project\scene_bootstrap.md).

---

## AI and Tools Used

This prototype was built using **Antigravity** (Google DeepMind's advanced coding assistant) through agentic capabilities:
- **Environment Analysis**: Executed automated shell commands (via powershell) to verify Cocos installations, check system path, and test path states.
- **Single-File Inline Bundle Engineering**: Programmed raw vector pipe visual layers dynamically inside HTML/SVG tags, eliminating external texture resource loading.
- **Procedural Audio Generation**: Designed synthesized sound effects using the browser's Web Audio API (`AudioContext`, `OscillatorNode`, and `GainNode`), making the game self-contained.
- **Runtime Scene Construction**: Implemented Cocos Creator 3.x layout, layer hierarchy (`Layers.Enum.UI_2D`), vector rendering (`Graphics` component), and custom touch event bindings programmatically.
- **Bezier Curve Approximation**: Formulated quadratic Bezier equations to render 90-degree corner curves for grid-aligned pipe flows.
- **BFS Pathfinding**: Coded standard Breadth-First Search (BFS) logic to dynamically scan connected cells in a grid, enabling real-time neon water flows.

---

## Known Issues & Notes

- **Autoplay Audio Policy**: Modern web browsers restrict audio playback until a user interaction (like a tap) occurs. 
  - *Fix implemented*: We integrated a full-screen "Tutorial Tap Indicator Overlay". When the player performs their first tap anywhere on the screen, it dismisses the tutorial and initializes the browser's `AudioContext`, ensuring tap clicks and chimes play correctly from the start.
- **Sound Simulation in Cocos Scripts**: In `PipeGame.ts`, the sound is mocked with `console.log()` calls and placeholder logic. For a final Cocos compilation, you should import `AudioClip` files and assign them in the `AudioSource` component.
