use std::hint::black_box;
use std::time::Instant;

use crate::errors::TerrainCodecResult;
use super::{
    check_buffer_safe, initialize_ring_buffer, lzss_compress, lzss_decompress, MAX_SIZE,
    RING_BUFFER_SIZE, THRESHOLD,
};

const CANDIDATE_COUNT: usize = 4096 - 18;
const WORD_COUNT: usize = 64;

struct Fixture {
    name: &'static str,
    bytes: &'static [u8],
    output_size: usize,
}

const FIXTURES: [Fixture; 4] = [
    Fixture {
        name: "Otto Matic EarthFarm",
        bytes: include_bytes!("../../games/originals/ottomatic/Data/Terrain/EarthFarm.ter"),
        output_size: 128 * 128 * 2,
    },
    Fixture {
        name: "Bugdom 2 Level1_Garden",
        bytes: include_bytes!(
            "../../games/originals/bugdom2/Data/Terrain/Level1_Garden.ter"
        ),
        output_size: 128 * 128 * 2,
    },
    Fixture {
        name: "Cro-Mag Rally StoneAge_Jungle",
        bytes: include_bytes!(
            "../../games/originals/cromagrally/Data/Terrain/StoneAge_Jungle.ter"
        ),
        output_size: 128 * 128 * 2,
    },
    Fixture {
        name: "Billy Frontier town_stampede",
        bytes: include_bytes!(
            "../../games/originals/billyfrontier/Data/Terrain/town_stampede.ter"
        ),
        output_size: 256 * 256 * 2,
    },
];

fn indexed_compress(input: &[u8], stop_at_maximum: bool) -> TerrainCodecResult<Vec<u8>> {
    let mut output = vec![0u8];
    let mut ring_buffer = vec![0u8; 4096 + 18 - 1];
    ring_buffer[..CANDIDATE_COUNT].fill(b' ');
    let mut byte_positions = [0u64; 256 * WORD_COUNT];
    for offset in 0..CANDIDATE_COUNT {
        byte_positions[usize::from(ring_buffer[offset]) * WORD_COUNT + offset / 64] |=
            1u64 << (offset % 64);
    }

    let mut source_position = 0usize;
    let mut ring_position = 4096 - 18;
    let mut flag_byte = 0u8;
    let mut flag_count = 0usize;
    let mut flag_position = 0usize;

    while source_position < input.len() {
        if flag_count == 8 {
            output[flag_position] = flag_byte;
            flag_position = output.len();
            output.push(0);
            flag_byte = 0;
            flag_count = 0;
        }

        let mut best_length = 0usize;
        let mut best_offset = 0usize;
        let first_byte = usize::from(input[source_position]);
        for word_index in 0..WORD_COUNT {
            let mut candidates = byte_positions[first_byte * WORD_COUNT + word_index];
            while candidates != 0 {
                let bit_index = candidates.trailing_zeros() as usize;
                let candidate_offset = word_index * 64 + bit_index;
                if candidate_offset >= CANDIDATE_COUNT {
                    break;
                }
                candidates &= candidates - 1;

                let mut length = 0usize;
                while length < 18
                    && source_position + length < input.len()
                    && ring_buffer[(candidate_offset + length) & 4095]
                        == input[source_position + length]
                {
                    length += 1;
                }
                if length > best_length {
                    best_length = length;
                    best_offset = candidate_offset;
                    if stop_at_maximum && best_length == MAX_SIZE.min(input.len() - source_position) {
                        break;
                    }
                }
            }
            if stop_at_maximum && best_length == MAX_SIZE.min(input.len() - source_position) {
                break;
            }
        }

        if best_length > 2 && is_safe(ring_position, best_offset, best_length) {
            output.push((best_offset & 0xff) as u8);
            output.push((((best_offset >> 8) & 0x0f) as u8) << 4 | (best_length - 3) as u8);
            for offset in 0..best_length {
                update_ring(
                    &mut ring_buffer,
                    &mut byte_positions,
                    ring_position,
                    input[source_position + offset],
                );
                ring_position = (ring_position + 1) & 4095;
            }
            source_position += best_length;
            flag_count += 1;
        } else {
            let literal = input[source_position];
            output.push(literal);
            flag_byte |= 1 << flag_count;
            flag_count += 1;
            update_ring(&mut ring_buffer, &mut byte_positions, ring_position, literal);
            ring_position = (ring_position + 1) & 4095;
            source_position += 1;
        }
    }

    if flag_count > 0 {
        output[flag_position] = flag_byte;
    }
    Ok(output)
}

fn early_exit_compress(input: &[u8], use_wide_comparison: bool) -> TerrainCodecResult<Vec<u8>> {
    let mut output = vec![0u8];
    let mut ring_buffer = initialize_ring_buffer();
    let mut source_position = 0usize;
    let mut ring_position = RING_BUFFER_SIZE - MAX_SIZE;
    let mut flag_byte = 0u8;
    let mut flag_count = 0usize;
    let mut flag_position = 0usize;

    while source_position < input.len() {
        if flag_count == 8 {
            output[flag_position] = flag_byte;
            flag_position = output.len();
            output.push(0);
            flag_byte = 0;
            flag_count = 0;
        }

        let maximum_length = MAX_SIZE.min(input.len() - source_position);
        let mut best_length = 0usize;
        let mut best_offset = 0usize;
        for candidate_offset in 0..(RING_BUFFER_SIZE - MAX_SIZE) {
            let mut length = 0usize;
            length = if use_wide_comparison {
                wide_match_length(
                    &ring_buffer,
                    candidate_offset,
                    input,
                    source_position,
                    maximum_length,
                )
            } else {
                while length < maximum_length
                    && ring_buffer[(candidate_offset + length) & (RING_BUFFER_SIZE - 1)]
                        == input[source_position + length]
                {
                    length += 1;
                }
                length
            };
            if length > best_length {
                best_length = length;
                best_offset = candidate_offset;
                if best_length == maximum_length {
                    break;
                }
            }
        }

        if best_length > THRESHOLD && check_buffer_safe(ring_position, best_offset, best_length) {
            output.push((best_offset & 0xff) as u8);
            output.push((((best_offset >> 8) & 0x0f) as u8) << 4 | (best_length - 3) as u8);
            for offset in 0..best_length {
                let byte = input[source_position + offset];
                ring_buffer[ring_position] = byte;
                ring_position = (ring_position + 1) & (RING_BUFFER_SIZE - 1);
            }
            source_position += best_length;
            flag_count += 1;
        } else {
            let literal = input[source_position];
            output.push(literal);
            flag_byte |= 1 << flag_count;
            flag_count += 1;
            ring_buffer[ring_position] = literal;
            ring_position = (ring_position + 1) & (RING_BUFFER_SIZE - 1);
            source_position += 1;
        }
    }

    if flag_count > 0 {
        output[flag_position] = flag_byte;
    }
    Ok(output)
}

fn wide_match_length(
    ring_buffer: &[u8],
    candidate_offset: usize,
    input: &[u8],
    source_position: usize,
    maximum_length: usize,
) -> usize {
    let mut length = 0usize;
    while length + 4 <= maximum_length {
        let ring_word = u32::from_ne_bytes([
            ring_buffer[(candidate_offset + length) & (RING_BUFFER_SIZE - 1)],
            ring_buffer[(candidate_offset + length + 1) & (RING_BUFFER_SIZE - 1)],
            ring_buffer[(candidate_offset + length + 2) & (RING_BUFFER_SIZE - 1)],
            ring_buffer[(candidate_offset + length + 3) & (RING_BUFFER_SIZE - 1)],
        ]);
        let input_word = u32::from_ne_bytes([
            input[source_position + length],
            input[source_position + length + 1],
            input[source_position + length + 2],
            input[source_position + length + 3],
        ]);
        if ring_word != input_word {
            break;
        }
        length += 4;
    }
    while length < maximum_length
        && ring_buffer[(candidate_offset + length) & (RING_BUFFER_SIZE - 1)]
            == input[source_position + length]
    {
        length += 1;
    }
    length
}

fn two_byte_index_compress(input: &[u8]) -> TerrainCodecResult<Vec<u8>> {
    let mut output = vec![0u8];
    let mut ring_buffer = initialize_ring_buffer();
    let mut positions = vec![0u64; 65536 * WORD_COUNT];
    for offset in 0..CANDIDATE_COUNT {
        let key = (usize::from(ring_buffer[offset]) << 8)
            | usize::from(ring_buffer[(offset + 1) & (RING_BUFFER_SIZE - 1)]);
        positions[key * WORD_COUNT + offset / 64] |= 1u64 << (offset % 64);
    }

    let mut source_position = 0usize;
    let mut ring_position = RING_BUFFER_SIZE - MAX_SIZE;
    let mut flag_byte = 0u8;
    let mut flag_count = 0usize;
    let mut flag_position = 0usize;
    while source_position < input.len() {
        if flag_count == 8 {
            output[flag_position] = flag_byte;
            flag_position = output.len();
            output.push(0);
            flag_byte = 0;
            flag_count = 0;
        }

        let maximum_length = MAX_SIZE.min(input.len() - source_position);
        let mut best_length = 0usize;
        let mut best_offset = 0usize;
        let key = if maximum_length >= 2 {
            (usize::from(input[source_position]) << 8)
                | usize::from(input[source_position + 1])
        } else {
            65536
        };
        if key < 65536 {
            for word_index in 0..WORD_COUNT {
                let mut candidates = positions[key * WORD_COUNT + word_index];
                while candidates != 0 {
                    let bit_index = candidates.trailing_zeros() as usize;
                    let candidate_offset = word_index * 64 + bit_index;
                    candidates &= candidates - 1;
                    if candidate_offset >= CANDIDATE_COUNT {
                        break;
                    }
                    let length = wide_match_length(
                        &ring_buffer,
                        candidate_offset,
                        input,
                        source_position,
                        maximum_length,
                    );
                    if length > best_length {
                        best_length = length;
                        best_offset = candidate_offset;
                        if best_length == maximum_length {
                            break;
                        }
                    }
                }
                if best_length == maximum_length {
                    break;
                }
            }
        }

        if best_length > THRESHOLD && check_buffer_safe(ring_position, best_offset, best_length) {
            output.push((best_offset & 0xff) as u8);
            output.push((((best_offset >> 8) & 0x0f) as u8) << 4 | (best_length - 3) as u8);
            for offset in 0..best_length {
                update_pair_index(&mut ring_buffer, &mut positions, ring_position, input[source_position + offset]);
                ring_position = (ring_position + 1) & (RING_BUFFER_SIZE - 1);
            }
            source_position += best_length;
            flag_count += 1;
        } else {
            let literal = input[source_position];
            output.push(literal);
            flag_byte |= 1 << flag_count;
            flag_count += 1;
            update_pair_index(&mut ring_buffer, &mut positions, ring_position, literal);
            ring_position = (ring_position + 1) & (RING_BUFFER_SIZE - 1);
            source_position += 1;
        }
    }
    if flag_count > 0 {
        output[flag_position] = flag_byte;
    }
    Ok(output)
}

fn update_pair_index(ring: &mut [u8], positions: &mut [u64], position: usize, byte: u8) {
    let previous = (position + RING_BUFFER_SIZE - 1) & (RING_BUFFER_SIZE - 1);
    if position < CANDIDATE_COUNT {
        clear_pair(ring, positions, position);
    }
    if previous < CANDIDATE_COUNT {
        clear_pair(ring, positions, previous);
    }
    ring[position] = byte;
    if previous < CANDIDATE_COUNT {
        set_pair(ring, positions, previous);
    }
    if position < CANDIDATE_COUNT {
        set_pair(ring, positions, position);
    }
}

fn clear_pair(ring: &[u8], positions: &mut [u64], offset: usize) {
    let key = (usize::from(ring[offset]) << 8)
        | usize::from(ring[(offset + 1) & (RING_BUFFER_SIZE - 1)]);
    positions[key * WORD_COUNT + offset / 64] &= !(1u64 << (offset % 64));
}

fn set_pair(ring: &[u8], positions: &mut [u64], offset: usize) {
    let key = (usize::from(ring[offset]) << 8)
        | usize::from(ring[(offset + 1) & (RING_BUFFER_SIZE - 1)]);
    positions[key * WORD_COUNT + offset / 64] |= 1u64 << (offset % 64);
}

fn update_ring(
    ring_buffer: &mut [u8],
    byte_positions: &mut [u64; 256 * WORD_COUNT],
    position: usize,
    byte: u8,
) {
    if position < CANDIDATE_COUNT {
        let old_byte = usize::from(ring_buffer[position]);
        byte_positions[old_byte * WORD_COUNT + position / 64] &= !(1u64 << (position % 64));
        byte_positions[usize::from(byte) * WORD_COUNT + position / 64] |=
            1u64 << (position % 64);
    }
    ring_buffer[position] = byte;
}

fn is_safe(ring_position: usize, reference_position: usize, length: usize) -> bool {
    (0..length).all(|offset| (reference_position + offset) % 4096 != ring_position)
}

fn fixture_chunks(bytes: &'static [u8], sample_count: usize) -> Vec<&'static [u8]> {
    let mut chunks = Vec::with_capacity(sample_count);
    let mut position = 0usize;
    while chunks.len() < sample_count {
        let chunk_size = u32::from_be_bytes([
            bytes[position],
            bytes[position + 1],
            bytes[position + 2],
            bytes[position + 3],
        ]) as usize;
        position += 4;
        chunks.push(&bytes[position..position + chunk_size]);
        position += chunk_size;
    }
    chunks
}

#[test]
#[ignore = "manual performance benchmark"]
fn compare_compressor_variants() {
    const SAMPLE_COUNT: usize = 4;
    let fixture_data: Vec<(&Fixture, Vec<&[u8]>, Vec<Vec<u8>>)> = FIXTURES
        .iter()
        .map(|fixture| {
            let chunks = fixture_chunks(fixture.bytes, SAMPLE_COUNT);
            let decompressed = chunks
                .iter()
                .map(|chunk| {
                    lzss_decompress(chunk, fixture.output_size).expect("fixture should decode")
                })
                .collect();
            (fixture, chunks, decompressed)
        })
        .collect();

    let baseline_outputs: Vec<Vec<u8>> = fixture_data
        .iter()
        .flat_map(|(_, _, inputs)| inputs.iter())
        .map(|input| lzss_compress(input).expect("fixture should encode"))
        .collect();
    let indexed_outputs: Vec<Vec<u8>> = fixture_data
        .iter()
        .flat_map(|(_, _, inputs)| inputs.iter())
        .map(|input| indexed_compress(input, false).expect("fixture should encode"))
        .collect();
    let combined_outputs: Vec<Vec<u8>> = fixture_data
        .iter()
        .flat_map(|(_, _, inputs)| inputs.iter())
        .map(|input| indexed_compress(input, true).expect("fixture should encode"))
        .collect();
    let early_exit_outputs: Vec<Vec<u8>> = fixture_data
        .iter()
        .flat_map(|(_, _, inputs)| inputs.iter())
        .map(|input| early_exit_compress(input, false).expect("fixture should encode"))
        .collect();
    let wide_outputs: Vec<Vec<u8>> = fixture_data
        .iter()
        .flat_map(|(_, _, inputs)| inputs.iter())
        .map(|input| early_exit_compress(input, true).expect("fixture should encode"))
        .collect();
    let two_byte_outputs: Vec<Vec<u8>> = fixture_data
        .iter()
        .flat_map(|(_, _, inputs)| inputs.iter())
        .map(|input| two_byte_index_compress(input).expect("fixture should encode"))
        .collect();
    assert_eq!(baseline_outputs, indexed_outputs);
    assert_eq!(baseline_outputs, combined_outputs);
    assert_eq!(baseline_outputs, early_exit_outputs);
    assert_eq!(baseline_outputs, wide_outputs);
    assert_eq!(baseline_outputs, two_byte_outputs);

    let baseline_start = Instant::now();
    for input in fixture_data.iter().flat_map(|(_, _, inputs)| inputs) {
        black_box(lzss_compress(input).expect("fixture should encode"));
    }
    let baseline_elapsed = baseline_start.elapsed();

    let indexed_start = Instant::now();
    for input in fixture_data.iter().flat_map(|(_, _, inputs)| inputs) {
        black_box(indexed_compress(input, false).expect("fixture should encode"));
    }
    let indexed_elapsed = indexed_start.elapsed();

    let combined_start = Instant::now();
    for input in fixture_data.iter().flat_map(|(_, _, inputs)| inputs) {
        black_box(indexed_compress(input, true).expect("fixture should encode"));
    }
    let combined_elapsed = combined_start.elapsed();

    let early_exit_start = Instant::now();
    for input in fixture_data.iter().flat_map(|(_, _, inputs)| inputs) {
        black_box(early_exit_compress(input, false).expect("fixture should encode"));
    }
    let early_exit_elapsed = early_exit_start.elapsed();

    let wide_start = Instant::now();
    for input in fixture_data.iter().flat_map(|(_, _, inputs)| inputs) {
        black_box(early_exit_compress(input, true).expect("fixture should encode"));
    }
    let wide_elapsed = wide_start.elapsed();

    let two_byte_start = Instant::now();
    for input in fixture_data.iter().flat_map(|(_, _, inputs)| inputs) {
        black_box(two_byte_index_compress(input).expect("fixture should encode"));
    }
    let two_byte_elapsed = two_byte_start.elapsed();

    let total_chunks = FIXTURES.len() * SAMPLE_COUNT;
    println!("LZSS compressor variants: {total_chunks} chunks across 4 games");
    for (fixture, chunks, inputs) in &fixture_data {
        let compressed_bytes = chunks.iter().map(|chunk| chunk.len()).sum::<usize>();
        let decoded_bytes = inputs.iter().map(Vec::len).sum::<usize>();
        println!(
            "  {}: {decoded_bytes} decoded bytes, {compressed_bytes} compressed bytes",
            fixture.name
        );
    }
    println!("  current: {baseline_elapsed:?}");
    println!("  indexed: {indexed_elapsed:?}");
    println!("  early-exit: {early_exit_elapsed:?}");
    println!("  indexed + early-exit: {combined_elapsed:?}");
    println!("  early-exit + wide compare: {wide_elapsed:?}");
    println!("  two-byte index + early-exit + wide compare: {two_byte_elapsed:?}");
    println!(
        "  indexed speedup: {:.2}x",
        baseline_elapsed.as_secs_f64() / indexed_elapsed.as_secs_f64()
    );
    println!(
        "  early-exit speedup: {:.2}x",
        baseline_elapsed.as_secs_f64() / early_exit_elapsed.as_secs_f64()
    );
    println!(
        "  indexed + early-exit speedup: {:.2}x",
        baseline_elapsed.as_secs_f64() / combined_elapsed.as_secs_f64()
    );
    println!(
        "  early-exit + wide compare speedup: {:.2}x",
        baseline_elapsed.as_secs_f64() / wide_elapsed.as_secs_f64()
    );
    println!(
        "  two-byte index speedup: {:.2}x",
        baseline_elapsed.as_secs_f64() / two_byte_elapsed.as_secs_f64()
    );
}

#[test]
#[ignore = "manual performance benchmark"]
fn benchmark_otto_matic_earthfarm_round_trip() {
    const SAMPLE_COUNT: usize = 8;
    let fixture = &FIXTURES[0];
    let chunks = fixture_chunks(fixture.bytes, SAMPLE_COUNT);
    let inputs: Vec<Vec<u8>> = chunks
        .iter()
        .map(|chunk| {
            lzss_decompress(chunk, fixture.output_size).expect("EarthFarm should decode")
        })
        .collect();

    let baseline_start = Instant::now();
    let baseline_outputs: Vec<Vec<u8>> = inputs
        .iter()
        .map(|input| lzss_compress(input).expect("EarthFarm should encode"))
        .collect();
    let baseline_elapsed = baseline_start.elapsed();

    let combined_start = Instant::now();
    let combined_outputs: Vec<Vec<u8>> = inputs
        .iter()
        .map(|input| indexed_compress(input, true).expect("EarthFarm should encode"))
        .collect();
    let combined_elapsed = combined_start.elapsed();

    assert_eq!(baseline_outputs, combined_outputs);
    for (input, encoded) in inputs.iter().zip(&combined_outputs) {
        let decoded = lzss_decompress(encoded, input.len()).expect("encoded EarthFarm should decode");
        assert_eq!(&decoded, input);
    }

    println!("Otto Matic EarthFarm: {SAMPLE_COUNT} chunks round-tripped");
    println!("  current encode: {baseline_elapsed:?}");
    println!("  combined encode: {combined_elapsed:?}");
    println!(
        "  speedup: {:.2}x",
        baseline_elapsed.as_secs_f64() / combined_elapsed.as_secs_f64()
    );
}
