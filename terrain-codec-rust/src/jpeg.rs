use crate::errors::{TerrainCodecError, TerrainCodecResult};
use jpeg_decoder::{Decoder, PixelFormat};
use jpeg_encoder::{ColorType, Encoder};

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

fn rgba_from_rgb(rgb_bytes: Vec<u8>) -> Vec<u8> {
    let mut rgba = Vec::with_capacity((rgb_bytes.len() / 3) * 4);
    for rgb in rgb_bytes.chunks_exact(3) {
        rgba.push(rgb[0]);
        rgba.push(rgb[1]);
        rgba.push(rgb[2]);
        rgba.push(255);
    }
    rgba
}

fn rgba_from_luma(luma_bytes: Vec<u8>) -> Vec<u8> {
    let mut rgba = Vec::with_capacity(luma_bytes.len() * 4);
    for luma in luma_bytes {
        rgba.push(luma);
        rgba.push(luma);
        rgba.push(luma);
        rgba.push(255);
    }
    rgba
}

pub fn decode_jpeg_rgba(jpeg_bytes: &[u8]) -> TerrainCodecResult<(Vec<u8>, u32, u32)> {
    let mut decoder = Decoder::new(jpeg_bytes);
    let decoded = decoder
        .decode()
        .map_err(|error| TerrainCodecError::decode_failed(format!("JPEG decode failed: {error}")))?;
    let Some(info) = decoder.info() else {
        return Err(TerrainCodecError::decode_failed("JPEG metadata was missing"));
    };

    let rgba = match info.pixel_format {
        PixelFormat::RGB24 => rgba_from_rgb(decoded),
        PixelFormat::L8 => rgba_from_luma(decoded),
        PixelFormat::CMYK32 => {
            let mut rgba = Vec::with_capacity((decoded.len() / 4) * 4);
            for cmyk in decoded.chunks_exact(4) {
                let cyan = u16::from(cmyk[0]);
                let magenta = u16::from(cmyk[1]);
                let yellow = u16::from(cmyk[2]);
                let black = u16::from(cmyk[3]);
                let red = 255u16.saturating_sub((cyan + black).min(255));
                let green = 255u16.saturating_sub((magenta + black).min(255));
                let blue = 255u16.saturating_sub((yellow + black).min(255));
                rgba.push(u8::try_from(red).unwrap_or(0));
                rgba.push(u8::try_from(green).unwrap_or(0));
                rgba.push(u8::try_from(blue).unwrap_or(0));
                rgba.push(255);
            }
            rgba
        }
        _ => {
            return Err(TerrainCodecError::decode_failed(
                "Unsupported JPEG pixel format returned by decoder",
            ))
        }
    };

    Ok((rgba, u32::from(info.width), u32::from(info.height)))
}

pub fn encode_jpeg_rgba(
    rgba_bytes: &[u8],
    width: u32,
    height: u32,
    quality: u8,
) -> TerrainCodecResult<Vec<u8>> {
    let expected_length = expected_rgba_length(width, height)?;
    if rgba_bytes.len() != expected_length {
        return Err(TerrainCodecError::invalid_input(format!(
            "Expected {expected_length} RGBA bytes for a {width}x{height} tile, received {}",
            rgba_bytes.len()
        )));
    }

    let mut rgb_bytes = Vec::with_capacity((rgba_bytes.len() / 4) * 3);
    for rgba in rgba_bytes.chunks_exact(4) {
        rgb_bytes.push(rgba[0]);
        rgb_bytes.push(rgba[1]);
        rgb_bytes.push(rgba[2]);
    }

    let mut output = Vec::new();
    let clamped_quality = quality.clamp(1, 100);
    let width_u16 = u16::try_from(width)
        .map_err(|_| TerrainCodecError::invalid_dimensions("JPEG width exceeds 16-bit range"))?;
    let height_u16 = u16::try_from(height)
        .map_err(|_| TerrainCodecError::invalid_dimensions("JPEG height exceeds 16-bit range"))?;
    let encoder = Encoder::new(&mut output, clamped_quality);
    encoder
        .encode(&rgb_bytes, width_u16, height_u16, ColorType::Rgb)
        .map_err(|error| TerrainCodecError::encode_failed(format!("JPEG encode failed: {error}")))?;
    Ok(output)
}
