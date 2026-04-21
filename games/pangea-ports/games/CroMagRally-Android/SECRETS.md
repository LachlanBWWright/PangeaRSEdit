# Cro-Mag Rally secrets

| Screen           | Keys         | What will happen                    |
|------------------|--------------|-------------------------------------|
| Any              | `F8`         | Cycle through 3 debug modes         |
| Main menu page 1 | `F1`         | Initiate self-running demo          |
| Character select | `↑` or `↓`   | Swap skins                          |
| Track select     | `B`+`R`+`I`* | Enter locked track                  |
| Vehicle select   | `B`+`R`+`I`* | Use locked car                      |
| In-game          | `B`+`R`+`I`* | Win race (your time won't be saved) |
| In-game          | `L`+`A`+`P`  | Skip lap                            |
| Main menu page 1 | `B`+`R`+`I`* | Set tournament progression to 100%  |

\* If your keyboard has trouble registering the B-R-I keys simultaneously, you can try C-M-R instead.

## WebAssembly build (browser) cheat / editor commands

The WebAssembly build exposes a JavaScript API for toggling gameplay features at runtime. Open the browser console while the game is running:

```javascript
// Fence collisions
GameCheat.setFenceCollision(0);   // disable fence collisions (drive through fences)
GameCheat.setFenceCollision(1);   // re-enable fence collisions
GameCheat.getFenceCollision();    // query current state (0 = disabled, 1 = enabled)
```

You can also click the **🔧** icon in the top-right corner of the browser window for a quick cheat panel.

### URL parameter shortcuts

Append these to the game URL to pre-configure before loading:

| Parameter | Example | Effect |
|---|---|---|
| `noFenceCollision` | `?noFenceCollision=1` | Launch with fence collisions disabled |
| `track` | `?track=5` | Boot directly to track 5 (1-based) |
| `car` | `?car=3` | Start with car 3 (1-based) |
| `levelOverride` | `?levelOverride=:Terrain:MyLevel.ter` | Load a custom terrain file |
