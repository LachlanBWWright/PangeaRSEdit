use lzss_rust::{lzss_compress, lzss_decompress};
use std::fs;

fn main() {
    // Test the same data
    let test_data = vec![
        72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33, // "Hello, World!"
        32, 72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33 // " Hello, World!" (repeated for compression)
    ];

    // Compress with Rust
    let compressed = lzss_compress(&test_data);
    println!("Rust compressed length: {}", compressed.len());
    println!("Rust compressed bytes: {}", 
        compressed.iter().take(20).map(|b| b.to_string()).collect::<Vec<_>>().join(","));

    // Decompress with Rust
    let decompressed = lzss_decompress(&compressed, test_data.len());
    println!("Rust decompressed matches original: {}", decompressed == test_data);

    // Save for comparison
    fs::write("/tmp/test_compressed_rust.bin", &compressed).unwrap();
    fs::write("/tmp/test_decompressed_rust.bin", &decompressed).unwrap();

    // Try to load TypeScript output for comparison if it exists
    if let Ok(ts_compressed) = fs::read("/tmp/test_compressed_ts.bin") {
        println!("TypeScript compressed length: {}", ts_compressed.len());
        println!("Compressed output matches TypeScript: {}", compressed == ts_compressed);
    }

    println!("Rust validation complete");
}