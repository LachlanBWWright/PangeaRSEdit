use crate::errors::{TerrainCodecError, TerrainCodecResult};
use crate::jpeg::{decode_jpeg_rgba, encode_jpeg_rgba};
use crate::lzss::{lzss_compress, lzss_decompress};
use crate::rgb555::{rgb555_to_rgba, rgba_to_rgb555};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DecodedTerrainTile {
    pub width: u32,
    pub height: u32,
    pub rgba_bytes: Vec<u8>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncodedTerrainTile {
    pub encoded_bytes: Vec<u8>,
}

fn expected_rgba_byte_length(width: u32, height: u32) -> TerrainCodecResult<usize> {
    let pixel_count = width
        .checked_mul(height)
        .ok_or_else(|| TerrainCodecError::invalid_dimensions("Terrain dimensions overflowed"))?;
    let byte_count = pixel_count
        .checked_mul(4)
        .ok_or_else(|| TerrainCodecError::invalid_dimensions("RGBA byte count overflowed"))?;
    usize::try_from(byte_count)
        .map_err(|_| TerrainCodecError::invalid_dimensions("RGBA byte count exceeds host limits"))
}

fn flip_rgba_rows_vertically(
    rgba_bytes: &[u8],
    width: u32,
    height: u32,
) -> TerrainCodecResult<Vec<u8>> {
    let row_byte_length = usize::try_from(width)
        .map_err(|_| TerrainCodecError::invalid_dimensions("Terrain width exceeds host limits"))?
        .checked_mul(4)
        .ok_or_else(|| TerrainCodecError::invalid_dimensions("RGBA row byte count overflowed"))?;
    let expected_length = expected_rgba_byte_length(width, height)?;
    if rgba_bytes.len() != expected_length {
        return Err(TerrainCodecError::invalid_input(format!(
            "Expected {expected_length} RGBA bytes for a {width}x{height} tile, received {}",
            rgba_bytes.len()
        )));
    }

    let mut flipped = vec![0; rgba_bytes.len()];
    let height_usize = usize::try_from(height)
        .map_err(|_| TerrainCodecError::invalid_dimensions("Terrain height exceeds host limits"))?;
    for row_index in 0..height_usize {
        let source_offset = row_index * row_byte_length;
        let target_offset = (height_usize - row_index - 1) * row_byte_length;
        flipped[target_offset..target_offset + row_byte_length]
            .copy_from_slice(&rgba_bytes[source_offset..source_offset + row_byte_length]);
    }

    Ok(flipped)
}

pub fn decode_lzss_terrain_tile(
    compressed_bytes: &[u8],
    width: u32,
    height: u32,
) -> TerrainCodecResult<DecodedTerrainTile> {
    let expected_output_size = width
        .checked_mul(height)
        .and_then(|pixel_count| pixel_count.checked_mul(2))
        .ok_or_else(|| TerrainCodecError::invalid_dimensions("LZSS output size overflowed"))?;
    let expected_output_size = usize::try_from(expected_output_size).map_err(|_| {
        TerrainCodecError::invalid_dimensions("LZSS output size exceeds host limits")
    })?;
    let rgb555_bytes = lzss_decompress(compressed_bytes, expected_output_size)?;
    let rgba_bytes = rgb555_to_rgba(&rgb555_bytes, width, height)?;
    Ok(DecodedTerrainTile {
        width,
        height,
        rgba_bytes,
    })
}

pub fn encode_lzss_terrain_tile(
    rgba_bytes: &[u8],
    width: u32,
    height: u32,
) -> TerrainCodecResult<EncodedTerrainTile> {
    let rgb555_bytes = rgba_to_rgb555(rgba_bytes, width, height)?;
    let compressed_bytes = lzss_compress(&rgb555_bytes)?;
    Ok(EncodedTerrainTile { encoded_bytes: compressed_bytes })
}

pub fn decode_jpeg_terrain_tile(
    jpeg_bytes: &[u8],
    expected_width: u32,
    expected_height: u32,
) -> TerrainCodecResult<DecodedTerrainTile> {
    let (rgba_bytes, width, height) = decode_jpeg_rgba(jpeg_bytes)?;
    if width != expected_width || height != expected_height {
        return Err(TerrainCodecError::decode_failed(format!(
            "Expected JPEG tile dimensions {expected_width}x{expected_height}, decoded {width}x{height}"
        )));
    }
    let flipped_rgba_bytes = flip_rgba_rows_vertically(&rgba_bytes, width, height)?;
    Ok(DecodedTerrainTile {
        width,
        height,
        rgba_bytes: flipped_rgba_bytes,
    })
}

pub fn encode_jpeg_terrain_tile(
    rgba_bytes: &[u8],
    width: u32,
    height: u32,
    quality: u8,
) -> TerrainCodecResult<EncodedTerrainTile> {
    let flipped_rgba_bytes = flip_rgba_rows_vertically(rgba_bytes, width, height)?;
    let encoded_bytes = encode_jpeg_rgba(&flipped_rgba_bytes, width, height, quality)?;
    Ok(EncodedTerrainTile { encoded_bytes })
}

#[cfg(test)]
mod tests {
    use super::{decode_jpeg_terrain_tile, decode_lzss_terrain_tile, encode_jpeg_terrain_tile, encode_lzss_terrain_tile};

    fn test_rgba_rows() -> Vec<u8> {
        vec![
            248, 0, 0, 255, 248, 0, 0, 255,
            248, 0, 0, 255, 248, 0, 0, 255,
            0, 248, 0, 255, 0, 248, 0, 255,
            0, 248, 0, 255, 0, 248, 0, 255,
            0, 0, 248, 255, 0, 0, 248, 255,
            0, 0, 248, 255, 0, 0, 248, 255,
        ]
    }

    fn row_average(decoded: &[u8], row_index: usize, width: usize) -> (u32, u32, u32) {
        let row_start = row_index * width * 4;
        let row_end = row_start + width * 4;
        let row = &decoded[row_start..row_end];
        let mut red_total = 0u32;
        let mut green_total = 0u32;
        let mut blue_total = 0u32;
        for pixel in row.chunks_exact(4) {
            red_total += u32::from(pixel[0]);
            green_total += u32::from(pixel[1]);
            blue_total += u32::from(pixel[2]);
        }
        let divisor = u32::try_from(width).unwrap_or(1);
        (red_total / divisor, green_total / divisor, blue_total / divisor)
    }

    #[test]
    fn lzss_terrain_tiles_round_trip_exactly() {
        let rgba_bytes = test_rgba_rows();
        let encoded = encode_lzss_terrain_tile(&rgba_bytes, 2, 6).expect("lzss encode should succeed");
        let decoded = decode_lzss_terrain_tile(&encoded.encoded_bytes, 2, 6)
            .expect("lzss decode should succeed");

        assert_eq!(decoded.width, 2);
        assert_eq!(decoded.height, 6);
        assert_eq!(decoded.rgba_bytes, rgba_bytes);
    }

    #[test]
    fn jpeg_terrain_tiles_preserve_top_down_orientation() {
        let rgba_bytes = test_rgba_rows();
        let encoded =
            encode_jpeg_terrain_tile(&rgba_bytes, 2, 6, 100).expect("jpeg encode should succeed");
        let decoded = decode_jpeg_terrain_tile(&encoded.encoded_bytes, 2, 6)
            .expect("jpeg decode should succeed");

        assert_eq!(decoded.width, 2);
        assert_eq!(decoded.height, 6);

        let top_row = row_average(&decoded.rgba_bytes, 0, 2);
        let middle_row = row_average(&decoded.rgba_bytes, 2, 2);
        let bottom_row = row_average(&decoded.rgba_bytes, 5, 2);

        assert!(top_row.0 > top_row.1);
        assert!(top_row.0 > top_row.2);
        assert!(middle_row.1 > middle_row.0);
        assert!(middle_row.1 > middle_row.2);
        assert!(bottom_row.2 > bottom_row.0);
        assert!(bottom_row.2 > bottom_row.1);
    }
}
