# GitHub Copilot Instructions for PangeaRSEdit

This repository contains a web-based 3D model viewer and editor for Pangea Software game assets, specifically focusing on BG3D models and skeleton files.

## Project Structure

- **Frontend**: React + TypeScript application in `/frontend/`
- **Model Parsers**: Custom parsers for BG3D and skeleton files in `/frontend/src/modelParsers/`
- **Game Assets**: Pre-extracted game files in `/frontend/public/PangeaRSEdit/games/`
- **Tests**: Unit tests (Vitest) and E2E tests (Playwright)

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **3D Graphics**: Three.js, React Three Fiber, @react-three/drei
- **Model Processing**: gltf-transform, custom BG3D parsers
- **Testing**: Vitest (unit), Playwright (E2E), gltf-validator
- **Build**: Vite with custom configuration for WASM and workers

## Code Quality Standards

### TypeScript
- Strict typing enabled - avoid `any` types
- Use nullish coalescing (`??`) instead of logical OR (`||`) for falsy checks
- Prefer optional chaining (`?.`) over manual null checks
- No non-null assertions (`!`) unless absolutely necessary

### React
- Functional components with hooks
- Proper dependency arrays in useEffect
- Use useCallback for event handlers when needed
- Error boundaries for 3D components

### ESLint Configuration
- Enhanced anti-any rules enabled
- Project-aware TypeScript parsing
- Test files have relaxed rules for pragmatic testing

## Working with Game Assets

### File Structure
```
frontend/public/PangeaRSEdit/games/
├── ottomatic/
│   ├── models/          # Level and object BG3D files
│   └── skeletons/       # Character BG3D + skeleton.rsrc pairs
├── bugdom2/
├── cromagrally/
├── nanosaur2/
└── billyfrontier/
```

### Model Loading
- BG3D files contain 3D model data
- Skeleton files (`.skeleton.rsrc`) contain animation data
- Models can be loaded with or without skeleton data
- All files should be exposed through GameModelSelector component

## Testing Guidelines

### Unit Tests
- Focus on model parsing and skeleton system functionality
- Use gltf-validator for output validation
- Mock heavy dependencies like Pyodide

### E2E Tests
- Test full user workflows (game selection → model loading → animation)
- Capture screenshots for visual verification
- Monitor console for errors during 3D operations
- Use headless mode in CI environments

## Common Patterns

### Model Loading
```typescript
// Load BG3D with optional skeleton
const { bg3dFile, skeletonFile } = await loadGameModel(gameName, modelName);
const gltfDocument = await convertBG3DToGLTF(bg3dFile, skeletonFile);
```

### Error Handling
```typescript
// Prefer specific error types over generic catching
try {
  await processModel();
} catch (error) {
  if (error instanceof ModelParsingError) {
    // Handle specific error
  }
  throw error; // Re-throw if unknown
}
```

### File Organization
- Keep model parsers in `/modelParsers/` with clear separation
- UI components in `/components/` with single responsibility
- Utilities in `/utils/` for shared functionality
- Types in `/types/` for shared TypeScript definitions

## Performance Considerations

- Model processing happens in Web Workers
- Large BG3D files are processed incrementally
- Three.js objects are properly disposed to prevent memory leaks
- Use React.memo for expensive 3D components

## Debugging

### Console Logging
- Model loading progress is logged to console
- Skeleton processing shows detailed bone hierarchy
- Animation validation logs PropertyBinding compatibility

### Visual Debugging
- Playwright tests capture screenshots at key stages
- 3D viewer includes wireframe and debug modes
- gltf-validator provides detailed model compliance reports

## New Feature Development

1. **Model Parser Extensions**: Add new game support by creating parsers in `/modelParsers/`
2. **UI Enhancements**: Extend GameModelSelector for new file types
3. **Animation Features**: Work with skeleton system in `/modelParsers/skeletonSystemNew.ts`
4. **Testing**: Add corresponding unit and E2E tests for all new features

## Build and Deployment

- Development: `npm run dev` (uses Vite)
- Production: `npm run build` (TypeScript + Vite)
- Testing: `npm test` (Vitest) and `npx playwright test`
- Linting: `npm run lint` (ESLint with strict rules)

## Important Notes

- All model files should be accessible through the UI
- Animation system requires gltf-transform compatibility
- Three.js PropertyBinding requires specific joint hierarchy
- Console errors during 3D operations indicate serious issues
- Screenshots are crucial for verifying UI functionality