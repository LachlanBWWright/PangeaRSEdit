use wasm_bindgen::prelude::*;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};

// Constants matching TypeScript implementation
const RING_BUFF_SIZE: usize = 4096; // 4095 - 0x0fff
const THRESHOLD: usize = 2;          // Minimum length
const MAX_SIZE: usize = 18;          // Min of 2 + 4 byte uint (2+16)

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// A macro to provide `println!(..)`-style syntax for `console.log` logging.
#[allow(unused_macros)]
macro_rules! console_log {
    ( $( $t:tt )* ) => {
        log(&format!( $( $t )* ))
    }
}

/// LZSS decompression function
/// 
/// # Arguments
/// * `compressed_data` - The compressed data as a byte slice
/// * `output_size` - Expected size of decompressed output
/// 
/// # Returns
/// A Vec<u8> containing the decompressed data
pub fn lzss_decompress(compressed_data: &[u8], output_size: usize) -> Vec<u8> {
    let mut output_buffer = vec![0u8; output_size];
    let source_size = compressed_data.len();

    let mut dest_buffer_pos = 0;
    let mut source_buffer_pos = 0;
    let mut ring_buffer_pos = RING_BUFF_SIZE - MAX_SIZE;

    // Initialize ring buffer - Any segment's position can be addressed with 12 bits (RING_BUFF_SIZE)
    let mut ring_buffer = vec![0u8; RING_BUFF_SIZE + MAX_SIZE - 1];
    for i in 0..(RING_BUFF_SIZE - MAX_SIZE) {
        ring_buffer[i] = b' '; // Initialize with space character like TypeScript
    }

    let mut flags = 0u32;
    
    loop {
        // Clear the latest bit flag
        flags /= 2;

        // Get the next 8 flags
        if flags < 256 {
            if source_buffer_pos >= source_size {
                break;
            }
            let flag_byte = compressed_data[source_buffer_pos] as u32;
            source_buffer_pos += 1;
            // The 0xff00 keeps the flags < 256 from triggering until 8 cycles (8 bits) have been used
            flags = flag_byte | 0xff00;
        }

        // Check if the latest flag is a 0 or 1
        // If 1, just copy 8 bits over
        if (flags & 1) != 0 {
            if source_buffer_pos >= source_size {
                break;
            }
            let data_byte = compressed_data[source_buffer_pos];
            source_buffer_pos += 1;

            if dest_buffer_pos < output_size {
                output_buffer[dest_buffer_pos] = data_byte;
                dest_buffer_pos += 1;
            }

            ring_buffer[ring_buffer_pos] = data_byte;
            ring_buffer_pos += 1;
            ring_buffer_pos &= RING_BUFF_SIZE - 1; // Loop around after 4095
        } else {
            // 12 bits for distance_offset, 4 bits for byte_length
            if source_buffer_pos >= source_size {
                break;
            }
            let mut distance_offset = compressed_data[source_buffer_pos] as usize;
            source_buffer_pos += 1;
            
            if source_buffer_pos >= source_size {
                break;
            }
            let mut byte_length = compressed_data[source_buffer_pos] as usize;
            source_buffer_pos += 1;

            // STEAL 4 bits from byte_length (12-bit uint - 0 - 4095)
            distance_offset |= (byte_length & 0xf0) << 4; // distance_offset - Distance Value

            // Ignore the 4 bits used for distance_offset, add min value
            byte_length = (byte_length & 0x0f) + THRESHOLD + 1; // byte_length - Length Value

            // Copy over (length) bytes
            for i in 0..byte_length {
                let data_byte = ring_buffer[(distance_offset + i) & (RING_BUFF_SIZE - 1)];
                
                if dest_buffer_pos < output_size {
                    output_buffer[dest_buffer_pos] = data_byte;
                    dest_buffer_pos += 1;
                }
                
                ring_buffer[ring_buffer_pos] = data_byte;
                ring_buffer_pos += 1;
                ring_buffer_pos &= RING_BUFF_SIZE - 1; // Loop around after 4095
            }
        }
    }

    output_buffer
}

/// LZSS compression function
/// 
/// # Arguments
/// * `decompressed_data` - The uncompressed data as a byte slice
/// 
/// # Returns
/// A Vec<u8> containing the compressed data
pub fn lzss_compress(decompressed_data: &[u8]) -> Vec<u8> {
    let mut output_buffer = Vec::with_capacity(decompressed_data.len() * 2);
    let mut ring_buffer = vec![0u8; RING_BUFF_SIZE + MAX_SIZE - 1];
    
    // Initialize ring buffer
    for i in 0..(RING_BUFF_SIZE - MAX_SIZE) {
        ring_buffer[i] = b' '; // Initialize with space character like TypeScript
    }

    let mut source_buffer_pos = 0;
    let mut ring_buffer_pos = RING_BUFF_SIZE - MAX_SIZE;
    let mut flag_byte = 0u8;
    let mut flag_count = 0;

    // Reserve space for the first flag byte
    let mut flag_pos = output_buffer.len();
    output_buffer.push(0);

    while source_buffer_pos < decompressed_data.len() {
        // Set new flag byte if the current one is full
        if flag_count == 8 {
            output_buffer[flag_pos] = flag_byte;
            flag_pos = output_buffer.len();
            output_buffer.push(0);
            flag_byte = 0;
            flag_count = 0;
        }

        // Find the longest match in the ring buffer
        let mut best_length = 0;
        let mut best_offset = 0;

        // Search for matches
        for i in 0..(RING_BUFF_SIZE - MAX_SIZE) {
            let mut length = 0;
            
            while length < MAX_SIZE
                && source_buffer_pos + length < decompressed_data.len()
                && ring_buffer[(i + length) & (RING_BUFF_SIZE - 1)] == decompressed_data[source_buffer_pos + length]
            {
                length += 1;
                if length >= MAX_SIZE {
                    break; // Max length
                }
            }

            if length > best_length {
                best_length = length;
                best_offset = i;
            }
        }

        // Check match size
        if best_length > THRESHOLD && check_buffer_safe(ring_buffer_pos, best_offset, best_length) {
            // Output the match
            let length_code = best_length - THRESHOLD - 1; // adjust to 0-15 range (matches decompression)
            let high_offset = (best_offset >> 8) & 0x0f; // Get top 4 bits of offset

            // Output the lower byte of the offset
            output_buffer.push((best_offset & 0xff) as u8);

            // Output the upper byte of the offset + length code
            output_buffer.push(((high_offset << 4) | length_code) as u8);

            // Update the ring buffer with all the matched bytes
            for i in 0..best_length {
                let byte = decompressed_data[source_buffer_pos + i];
                ring_buffer[ring_buffer_pos] = byte;
                ring_buffer_pos += 1;
                if ring_buffer_pos >= RING_BUFF_SIZE {
                    ring_buffer_pos = 0; // Loop around after 4095
                }
            }

            source_buffer_pos += best_length;
            flag_count += 1;
            // Don't need to set the flag bit, already 0
        } else {
            // Output a literal byte
            let byte = decompressed_data[source_buffer_pos];
            source_buffer_pos += 1;
            output_buffer.push(byte);

            flag_byte |= 1 << flag_count; // Set the flag bit
            flag_count += 1;
            ring_buffer[ring_buffer_pos] = byte;

            ring_buffer_pos += 1;
            if ring_buffer_pos >= RING_BUFF_SIZE {
                ring_buffer_pos = 0; // Loop around after 4095
            }
        }
    }

    // Only write the final flag byte if we have flags to write
    if flag_count > 0 {
        output_buffer[flag_pos] = flag_byte;
    }

    output_buffer
}

/// Helper function to check if buffer access is safe
/// This matches the checkBufferSafe function from TypeScript
fn check_buffer_safe(ring_pos: usize, ref_pos: usize, length: usize) -> bool {
    for i in 0..length {
        let pos = (ref_pos + i) % RING_BUFF_SIZE;
        if pos == ring_pos {
            return false;
        }
    }
    true
}

// WebAssembly exports
#[wasm_bindgen]
pub fn wasm_lzss_compress(data: &[u8]) -> Vec<u8> {
    lzss_compress(data)
}

#[wasm_bindgen]
pub fn wasm_lzss_decompress(compressed_data: &[u8], output_size: usize) -> Vec<u8> {
    lzss_decompress(compressed_data, output_size)
}

/// Batch compression task
#[derive(Serialize, Deserialize)]
pub struct CompressionTask {
    pub id: u32,
    pub data: Vec<u8>,
}

/// Batch decompression task
#[derive(Serialize, Deserialize)]
pub struct DecompressionTask {
    pub id: u32,
    pub compressed_data: Vec<u8>,
    pub output_size: usize,
    pub width: u32,
    pub height: u32,
}

/// Batch compression result
#[derive(Serialize, Deserialize)]
pub struct CompressionResult {
    pub id: u32,
    pub compressed_data: Vec<u8>,
}

/// Batch decompression result
#[derive(Serialize, Deserialize)]
pub struct DecompressionResult {
    pub id: u32,
    pub decompressed_data: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

/// Batch compress multiple tasks in parallel using Rayon
#[wasm_bindgen]
pub fn wasm_lzss_compress_batch(tasks_js: JsValue) -> Result<JsValue, JsValue> {
    // Parse input tasks from JavaScript
    let tasks: Vec<CompressionTask> = serde_wasm_bindgen::from_value(tasks_js)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse tasks: {:?}", e)))?;
    
    // Process tasks in parallel using Rayon
    let results: Vec<CompressionResult> = tasks
        .into_par_iter()
        .map(|task| CompressionResult {
            id: task.id,
            compressed_data: lzss_compress(&task.data),
        })
        .collect();
    
    // Convert results back to JavaScript
    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize results: {:?}", e)))
}

/// Batch decompress multiple tasks in parallel using Rayon
#[wasm_bindgen]
pub fn wasm_lzss_decompress_batch(tasks_js: JsValue) -> Result<JsValue, JsValue> {
    // Parse input tasks from JavaScript
    let tasks: Vec<DecompressionTask> = serde_wasm_bindgen::from_value(tasks_js)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse tasks: {:?}", e)))?;
    
    // Process tasks in parallel using Rayon
    let results: Vec<DecompressionResult> = tasks
        .into_par_iter()
        .map(|task| DecompressionResult {
            id: task.id,
            decompressed_data: lzss_decompress(&task.compressed_data, task.output_size),
            width: task.width,
            height: task.height,
        })
        .collect();
    
    // Convert results back to JavaScript
    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize results: {:?}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_compression_decompression() {
        let input_data = b"Hello, World! This is a test string for LZSS compression.";
        let compressed = lzss_compress(input_data);
        let decompressed = lzss_decompress(&compressed, input_data.len());
        
        assert_eq!(input_data.to_vec(), decompressed);
    }

    #[test]
    fn test_empty_data() {
        let input_data: &[u8] = &[];
        let compressed = lzss_compress(input_data);
        let decompressed = lzss_decompress(&compressed, 0);
        
        assert_eq!(input_data.to_vec(), decompressed);
    }

    #[test]
    fn test_single_byte() {
        let input_data = &[42u8];
        let compressed = lzss_compress(input_data);
        let decompressed = lzss_decompress(&compressed, 1);
        
        assert_eq!(input_data.to_vec(), decompressed);
    }

    #[test]
    fn test_all_zeros() {
        let input_data = vec![0u8; 1000];
        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 1000);
        
        assert_eq!(input_data, decompressed);
    }

    #[test]
    fn test_all_255s() {
        let input_data = vec![255u8; 1000];
        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 1000);
        
        assert_eq!(input_data, decompressed);
    }

    #[test]
    fn test_repeating_pattern() {
        let mut input_data = Vec::new();
        for i in 0..1000 {
            input_data.push((i % 16) as u8);
        }
        
        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 1000);
        
        assert_eq!(input_data, decompressed);
    }

    #[test]
    fn test_random_data() {
        // Create deterministic "random" data for reproducible tests
        let mut input_data = Vec::new();
        let mut seed = 42u32;
        for _ in 0..1000 {
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            input_data.push((seed / 65536) as u8);
        }
        
        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 1000);
        
        assert_eq!(input_data, decompressed);
    }

    #[test]
    fn test_alternating_bytes() {
        let mut input_data = Vec::new();
        for i in 0..1000 {
            input_data.push(if i % 2 == 0 { 0 } else { 255 });
        }
        
        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 1000);
        
        assert_eq!(input_data, decompressed);
    }

    #[test]
    fn test_mixed_data() {
        let mut input_data = Vec::new();
        
        // First half zeros
        for _ in 0..500 {
            input_data.push(0);
        }
        
        // Second half "random"
        let mut seed = 42u32;
        for _ in 0..500 {
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            input_data.push((seed / 65536) as u8);
        }
        
        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 1000);
        
        assert_eq!(input_data, decompressed);
    }

    #[test]
    fn test_ring_buffer_boundary() {
        // Test data that spans the ring buffer boundary
        let mut input_data = Vec::new();
        
        // First 4K with pattern A
        for i in 0..4096 {
            input_data.push((i % 256) as u8);
        }
        
        // Second 4K with pattern B
        for i in 0..4096 {
            input_data.push((255 - (i % 256)) as u8);
        }
        
        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 8192);
        
        assert_eq!(input_data, decompressed);
    }

    #[test]
    fn test_multiple_rounds() {
        let input_data = b"The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.";
        
        // Test multiple rounds of compression/decompression
        for _ in 0..10 {
            let compressed = lzss_compress(input_data);
            let decompressed = lzss_decompress(&compressed, input_data.len());
            assert_eq!(input_data.to_vec(), decompressed);
        }
    }

    #[test]
    fn test_specific_hex_data() {
        // Test with actual hex data similar to the TypeScript test
        let hex_string = "89504e470d0a1a0a0000000d4948445200000080";
        let mut input_data = Vec::new();
        
        for i in (0..hex_string.len()).step_by(2) {
            if i + 1 < hex_string.len() {
                let byte_str = &hex_string[i..i+2];
                if let Ok(byte_val) = u8::from_str_radix(byte_str, 16) {
                    input_data.push(byte_val);
                }
            }
        }
        
        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, input_data.len());
        
        assert_eq!(input_data, decompressed);
    }
}
