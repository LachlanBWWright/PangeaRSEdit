use crate::errors::{TerrainCodecError, TerrainCodecResult};

fn expected_rgba_length(width: u32, height: u32) -> TerrainCodecResult<usize> {
    let pixel_count = width
        .checked_mul(height)
        .ok_or_else(|| TerrainCodecError::invalid_dimensions("Terrain dimensions overflowed"))?;
    let byte_count = pixel_count
        .checked_mul(4)
        .ok_or_else(|| TerrainCodecError::invalid_dimensions("RGBA byte count overflowed"))?;
    usize::try_from(byte_count)
        .map_err(|_| TerrainCodecError::invalid_dimensions("RGBA byte count exceeds host limits"))
}

fn expected_rgb555_length(width: u32, height: u32) -> TerrainCodecResult<usize> {
    let pixel_count = width
        .checked_mul(height)
        .ok_or_else(|| TerrainCodecError::invalid_dimensions("Terrain dimensions overflowed"))?;
    let byte_count = pixel_count
        .checked_mul(2)
        .ok_or_else(|| TerrainCodecError::invalid_dimensions("RGB555 byte count overflowed"))?;
    usize::try_from(byte_count)
        .map_err(|_| TerrainCodecError::invalid_dimensions("RGB555 byte count exceeds host limits"))
}

pub fn rgba_to_rgb555(rgba_bytes: &[u8], width: u32, height: u32) -> TerrainCodecResult<Vec<u8>> {
    let expected_length = expected_rgba_length(width, height)?;
    if rgba_bytes.len() != expected_length {
        return Err(TerrainCodecError::invalid_input(format!(
            "Expected {expected_length} RGBA bytes for a {width}x{height} tile, received {}",
            rgba_bytes.len()
        )));
    }

    let mut rgb555_bytes = Vec::with_capacity(expected_rgb555_length(width, height)?);
    for rgba in rgba_bytes.chunks_exact(4) {
        let red = rgba[0];
        let green = rgba[1];
        let blue = rgba[2];
        let alpha = rgba[3];
        let packed = ((u16::from(red) / 8) << 10)
            | ((u16::from(green) / 8) << 5)
            | (u16::from(blue) / 8)
            | if alpha == 0 { 0x8000 } else { 0 };
        rgb555_bytes.extend_from_slice(&packed.to_be_bytes());
    }

    Ok(rgb555_bytes)
}

pub fn rgb555_to_rgba(rgb555_bytes: &[u8], width: u32, height: u32) -> TerrainCodecResult<Vec<u8>> {
    let expected_length = expected_rgb555_length(width, height)?;
    if rgb555_bytes.len() != expected_length {
        return Err(TerrainCodecError::invalid_input(format!(
            "Expected {expected_length} RGB555 bytes for a {width}x{height} tile, received {}",
            rgb555_bytes.len()
        )));
    }

    let mut rgba_bytes = Vec::with_capacity(expected_rgba_length(width, height)?);
    for rgb555 in rgb555_bytes.chunks_exact(2) {
        let packed = u16::from_be_bytes([rgb555[0], rgb555[1]]);
        let red = ((packed & 0x7c00) >> 10) * 8;
        let green = ((packed & 0x03e0) >> 5) * 8;
        let blue = (packed & 0x001f) * 8;
        let alpha = if packed & 0x8000 != 0 { 0 } else { 255 };
        rgba_bytes.push(u8::try_from(red).unwrap_or(255));
        rgba_bytes.push(u8::try_from(green).unwrap_or(255));
        rgba_bytes.push(u8::try_from(blue).unwrap_or(255));
        rgba_bytes.push(alpha);
    }

    Ok(rgba_bytes)
}

#[cfg(test)]
mod tests {
    use super::{rgb555_to_rgba, rgba_to_rgb555};

    #[test]
    fn round_trips_rgba_and_rgb555() {
        let rgba = vec![
            248, 0, 0, 255, 0, 248, 0, 255, 0, 0, 248, 255, 255, 255, 255, 0,
        ];

        let rgb555 = rgba_to_rgb555(&rgba, 2, 2).expect("expected encode success");
        let decoded = rgb555_to_rgba(&rgb555, 2, 2).expect("expected decode success");

        assert_eq!(decoded, vec![
            248, 0, 0, 255, 0, 248, 0, 255, 0, 0, 248, 255, 248, 248, 248, 0,
        ]);
    }
}
