# LZSS Rust Implementation

This crate provides a Rust implementation of the LZSS (Lempel-Ziv-Storer-Szymanski) compression algorithm, designed to be identical in functionality to the TypeScript implementation used in the PangeaRSEdit project.

## Features

- **Identical Algorithm**: Implements the exact same LZSS algorithm as the TypeScript version
- **WebAssembly Support**: Compiled to WebAssembly for use in web applications
- **Comprehensive Testing**: Extensive test suite ensuring compatibility with the TypeScript implementation
- **Constants Matching**: Uses the same constants as the original implementation:
  - `RING_BUFF_SIZE = 4096`
  - `THRESHOLD = 2` 
  - `MAX_SIZE = 18`

## Usage

### Rust

```rust
use lzss_rust::{lzss_compress, lzss_decompress};

// Compress data
let input_data = b"Hello, World! This is a test string for LZSS compression.";
let compressed = lzss_compress(input_data);

// Decompress data
let decompressed = lzss_decompress(&compressed, input_data.len());
assert_eq!(input_data.to_vec(), decompressed);
```

### WebAssembly

```javascript
import init, { wasm_lzss_compress, wasm_lzss_decompress } from './pkg/lzss_rust.js';

await init();

// Compress data
const inputData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
const compressed = wasm_lzss_compress(inputData);

// Decompress data
const decompressed = wasm_lzss_decompress(compressed, inputData.length);
```

## Building for WebAssembly

```bash
wasm-pack build --target web
```

This generates WebAssembly bindings in the `pkg/` directory.

## Testing

Run the full test suite:

```bash
cargo test
```

The test suite includes:
- Basic functionality tests
- Edge cases (empty data, single bytes, etc.)
- Pattern-based tests (repeating patterns, gradients, etc.)
- Real-world data tests (PNG image data)
- Compatibility tests matching the TypeScript implementation
- Large data stress tests

## Algorithm Details

This implementation uses the LZSS algorithm with:
- A 4096-byte ring buffer for string matching
- 12-bit offset encoding (supporting up to 4095 bytes back-reference)
- 4-bit length encoding (supporting matches of 3-18 bytes)
- Flag bytes to distinguish between literals and matches
- Ring buffer initialization with space characters (0x20)

The algorithm is designed for terrain image data compression in the PangeaRSEdit game editor, where it's used in web workers to compress/decompress image data efficiently.

## Compatibility

This Rust implementation is designed to produce identical results to the TypeScript implementation found in `frontend/src/utils/lzss.ts`. The extensive test suite verifies compatibility across various data patterns including:

- Random data
- Repeating patterns
- PNG image data (from actual game assets)
- Text data
- Edge cases and boundary conditions

## Performance

The Rust implementation provides significant performance improvements over the TypeScript version while maintaining identical functionality and output.