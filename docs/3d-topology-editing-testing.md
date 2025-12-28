# 3D Topology Editing - Testing Guide

## Feature Overview

3D topology editing allows you to modify terrain heights directly in the 3D view, with visual feedback matching the 2D view capabilities.

## Prerequisites

1. Load a level in the editor
2. Switch to the 3D view
3. Enable "Topology" mode in the Tiles menu

## Testing Steps

### Basic Functionality

#### Test 1: Circle Brush - SET_VALUE Mode
1. Select "Circle" brush mode
2. Select "Set Value" mode
3. Set topology value to 100
4. Set brush radius to 3
5. Click on terrain in 3D view
6. **Expected:** Circular area set to height 100
7. **Verify:** Green circle indicator shows before click
8. **Verify:** Cyan wireframe preview shows expected height

#### Test 2: Square Brush - DELTA_VALUE Mode
1. Select "Square" brush mode
2. Select "Delta Value" mode
3. Set topology value to 20
4. Set brush radius to 2
5. Click on existing raised terrain
6. **Expected:** Square area raises by 20 units
7. **Verify:** Square indicator visible before click
8. **Verify:** Preview shows height increase

#### Test 3: Circle Brush - DELTA_WITH_DROPOFF Mode
1. Select "Circle" brush mode
2. Select "Delta with Dropoff" mode
3. Set topology value to 50
4. Set brush radius to 4
5. Click on flat terrain
6. **Expected:** Smooth hill with falloff to edges
7. **Verify:** Center has full effect, edges have minimal
8. **Verify:** Preview shows gradient effect

### Camera Controls

#### Test 4: Controls Disabled During Editing
1. Click and hold on terrain while in topology mode
2. Try to drag mouse to orbit camera
3. **Expected:** Camera does NOT move while mouse is down
4. Release mouse
5. Now drag to orbit
6. **Expected:** Camera moves normally after release

### Brush Visualization

#### Test 5: Brush Follows Mouse
1. Move mouse over terrain
2. **Expected:** Green circle/square follows mouse position
3. Change brush radius
4. **Expected:** Indicator size changes immediately
5. Switch between circle and square modes
6. **Expected:** Indicator shape changes

### Preview Visualization

#### Test 6: Preview Shows Accurate Changes
1. Hover over terrain without clicking
2. **Expected:** Cyan wireframe shows preview of changes
3. Change topology value
4. **Expected:** Preview updates to show new height
5. Change value mode (SET/DELTA/DROPOFF)
6. **Expected:** Preview changes accordingly

### Edge Cases

#### Test 7: Boundary Handling
1. Click near map edge
2. **Expected:** Brush applies only to valid tiles
3. **Expected:** No errors in console
4. Brush should clip to map boundaries

#### Test 8: Multiple Rapid Clicks
1. Click rapidly in different locations
2. **Expected:** Each click applies correctly
3. **Expected:** Terrain updates in real-time
4. **Expected:** No performance issues

### 2D/3D Consistency

#### Test 9: Identical Results
1. In 2D view, apply circle brush at coordinates (100, 100)
2. Note the resulting terrain shape
3. Undo changes
4. In 3D view, apply same brush at same world position
5. **Expected:** Identical terrain shape produced
6. **Verify:** Heights match exactly between views

### Performance

#### Test 10: Large Brush Performance
1. Set brush radius to maximum (10)
2. Enable DELTA_WITH_DROPOFF mode
3. Click in center of large map
4. **Expected:** Terrain updates within 1 second
5. **Expected:** No freezing or lag
6. **Expected:** Preview renders smoothly

#### Test 11: Rapid Mouse Movement
1. Move mouse quickly across terrain
2. **Expected:** Brush indicator follows smoothly
3. **Expected:** Preview updates without lag
4. **Expected:** No visual artifacts

## Known Limitations

1. Very large terrains (>2000x2000) may have slight performance impact
2. Preview mesh is separate from main mesh (slight visual difference possible)
3. Undo/redo support depends on parent component state management

## Troubleshooting

### Brush Not Visible
- **Check:** Is topology mode enabled?
- **Check:** Is 3D view active?
- **Check:** Mouse over terrain mesh?

### Changes Not Applying
- **Check:** Is topology editing enabled in Tiles menu?
- **Check:** Are you clicking on the terrain (not on items/fences)?
- **Check:** Console for any errors?

### Camera Still Moves While Editing
- **Check:** Release mouse button after click
- **Check:** Topology mode is active
- **Report as bug if persists**

## Success Criteria

✅ All brush modes work correctly
✅ Preview accurately shows changes
✅ Camera controls disable during editing
✅ Brush visualization follows mouse
✅ 2D and 3D produce identical results
✅ No performance issues on normal-sized maps
✅ No console errors during use
✅ Terrain updates in real-time

## Regression Testing

After any changes to the topology editing system, re-run:
1. Test 9 (2D/3D consistency) - CRITICAL
2. Test 4 (camera controls) - CRITICAL  
3. Test 1, 2, 3 (all three value modes) - CRITICAL
4. Test 10 (performance) - IMPORTANT

## Automated Tests

No automated tests yet - manual testing required.
Consider adding:
- Unit tests for brush calculation utilities
- Integration tests for 2D/3D parity
- Performance benchmarks for large terrains
