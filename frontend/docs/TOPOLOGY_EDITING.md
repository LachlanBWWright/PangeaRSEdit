# Topology Editing System

## Overview

The topology editing system allows users to modify terrain heightmaps in 3D view by painting directly onto the terrain surface.

## How It Works

### Visual Feedback

- **Green Circle/Square Indicator**: Shows the brush radius when hovering over the 3D terrain
  - Rendered by `TopologyBrush3D.tsx`
  - Updates position in real-time as mouse moves
  - Size matches brush radius setting

### Direct Editing

- **No Preview Layer**: Changes apply directly to the terrain heightmap
  - Previous versions showed a green overlay layer covering the entire map
  - New version provides clean, direct editing experience
  - `TopologyPreview3D.tsx` now returns null (disabled)

## User Experience

### What Users See

1. **Select Topology View**: Switch to topology editing mode
2. **Hover Over Terrain**: See green circle/square showing brush area
3. **Click and Drag**: Paint height changes onto terrain
4. **Immediate Feedback**: Changes visible instantly on terrain surface

### Advantages Over Previous System

- **No Confusing Overlay**: No green layer covering the map
- **Direct Manipulation**: Changes apply to actual heightmap
- **Clear Visual Feedback**: Simple circle shows exactly what will be affected
- **Better Performance**: No need to render duplicate full-terrain geometry
- **Intuitive Workflow**: Matches expectations from other 3D editing tools
