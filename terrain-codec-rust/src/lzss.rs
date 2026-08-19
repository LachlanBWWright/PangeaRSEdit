use crate::errors::{TerrainCodecError, TerrainCodecResult};

const RING_BUFFER_SIZE: usize = 4096;
const THRESHOLD: usize = 2;
const MAX_SIZE: usize = 18;
const INITIAL_BYTE: u8 = b' ';

fn initialize_ring_buffer() -> Vec<u8> {
    let mut ring_buffer = vec![0; RING_BUFFER_SIZE + MAX_SIZE - 1];
    for byte in ring_buffer.iter_mut().take(RING_BUFFER_SIZE - MAX_SIZE) {
        *byte = INITIAL_BYTE;
    }
    ring_buffer
}

fn check_buffer_safe(ring_position: usize, reference_position: usize, length: usize) -> bool {
    for offset in 0..length {
        let position = (reference_position + offset) % RING_BUFFER_SIZE;
        if position == ring_position {
            return false;
        }
    }
    true
}

pub fn lzss_decompress(compressed_bytes: &[u8], expected_output_size: usize) -> TerrainCodecResult<Vec<u8>> {
    let mut output = Vec::with_capacity(expected_output_size);
    let mut ring_buffer = initialize_ring_buffer();
    let mut ring_position = RING_BUFFER_SIZE - MAX_SIZE;
    let mut source_position = 0usize;
    let mut flags = 0u16;

    while output.len() < expected_output_size {
        flags >>= 1;

        if flags < 0x0100 {
            let Some(flag_byte) = compressed_bytes.get(source_position).copied() else {
                break;
            };
            source_position += 1;
            flags = u16::from(flag_byte) | 0xff00;
        }

        if flags & 1 != 0 {
            let Some(literal) = compressed_bytes.get(source_position).copied() else {
                break;
            };
            source_position += 1;
            output.push(literal);
            ring_buffer[ring_position] = literal;
            ring_position = (ring_position + 1) & (RING_BUFFER_SIZE - 1);
            continue;
        }

        let Some(distance_low_byte) = compressed_bytes.get(source_position).copied() else {
            break;
        };
        source_position += 1;
        let Some(length_byte) = compressed_bytes.get(source_position).copied() else {
            break;
        };
        source_position += 1;

        let distance_offset =
            u16::from(distance_low_byte) | (u16::from(length_byte & 0xf0) << 4);
        let match_length = usize::from(length_byte & 0x0f) + THRESHOLD + 1;
        let match_offset = usize::from(distance_offset);

        for offset in 0..match_length {
            let ring_index = (match_offset + offset) & (RING_BUFFER_SIZE - 1);
            let byte = ring_buffer[ring_index];
            output.push(byte);
            ring_buffer[ring_position] = byte;
            ring_position = (ring_position + 1) & (RING_BUFFER_SIZE - 1);
            if output.len() == expected_output_size {
                break;
            }
        }
    }

    if output.len() != expected_output_size {
        return Err(TerrainCodecError::decode_failed(format!(
            "Expected {expected_output_size} bytes after LZSS decompression, produced {}",
            output.len()
        )));
    }

    Ok(output)
}

pub fn lzss_compress(decompressed_bytes: &[u8]) -> TerrainCodecResult<Vec<u8>> {
    let mut output = vec![0u8];
    let mut ring_buffer = initialize_ring_buffer();
    let mut source_position = 0usize;
    let mut ring_position = RING_BUFFER_SIZE - MAX_SIZE;
    let mut flag_byte = 0u8;
    let mut flag_count = 0usize;
    let mut flag_position = 0usize;

    while source_position < decompressed_bytes.len() {
        if flag_count == 8 {
            output[flag_position] = flag_byte;
            flag_position = output.len();
            output.push(0);
            flag_byte = 0;
            flag_count = 0;
        }

        let mut best_length = 0usize;
        let mut best_offset = 0usize;

        for candidate_offset in 0..(RING_BUFFER_SIZE - MAX_SIZE) {
            let mut length = 0usize;
            while length < MAX_SIZE
                && source_position + length < decompressed_bytes.len()
                && ring_buffer[(candidate_offset + length) & (RING_BUFFER_SIZE - 1)]
                    == decompressed_bytes[source_position + length]
            {
                length += 1;
                if length >= MAX_SIZE {
                    break;
                }
            }

            if length > best_length {
                best_length = length;
                best_offset = candidate_offset;
            }
        }

        if best_length > THRESHOLD && check_buffer_safe(ring_position, best_offset, best_length) {
            let length_code = u8::try_from(best_length - THRESHOLD - 1)
                .map_err(|_| TerrainCodecError::encode_failed("Match length overflowed"))?;
            let high_offset = u8::try_from((best_offset >> 8) & 0x0f)
                .map_err(|_| TerrainCodecError::encode_failed("Offset overflowed"))?;

            output.push(u8::try_from(best_offset & 0xff)
                .map_err(|_| TerrainCodecError::encode_failed("Offset overflowed"))?);
            output.push((high_offset << 4) | length_code);

            for offset in 0..best_length {
                let byte = decompressed_bytes[source_position + offset];
                ring_buffer[ring_position] = byte;
                ring_position = (ring_position + 1) & (RING_BUFFER_SIZE - 1);
            }

            source_position += best_length;
            flag_count += 1;
            continue;
        }

        let literal = decompressed_bytes[source_position];
        source_position += 1;
        output.push(literal);
        flag_byte |= 1 << flag_count;
        flag_count += 1;
        ring_buffer[ring_position] = literal;
        ring_position = (ring_position + 1) & (RING_BUFFER_SIZE - 1);
    }

    if flag_count > 0 {
        output[flag_position] = flag_byte;
    }

    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::{lzss_compress, lzss_decompress};

    #[test]
    fn round_trips_repeating_pattern() {
        let input: Vec<u8> = (0..4096).map(|index| (index % 16) as u8).collect();
        let compressed = lzss_compress(&input).expect("expected compression success");
        let decompressed = lzss_decompress(&compressed, input.len()).expect("expected decompression success");
        assert_eq!(decompressed, input);
    }

    #[test]
    fn rejects_truncated_payload() {
        let compressed = vec![0, 1];
        let result = lzss_decompress(&compressed, 32);
        assert!(result.is_err());
    }
}
