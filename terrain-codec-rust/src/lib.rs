mod errors;
mod jpeg;
mod lzss;
mod nanosaur1;
mod rgb555;
mod terrain_image;

use errors::TerrainCodecError;
use js_sys::{Object, Reflect, Uint8Array};
use nanosaur1::{compile_nanosaur1_level, parse_nanosaur1_level, Nanosaur1CompilePayload};
use terrain_image::{
    decode_jpeg_terrain_tile, decode_lzss_terrain_tile, encode_jpeg_terrain_tile,
    encode_lzss_terrain_tile,
};
use wasm_bindgen::prelude::*;

fn set_property(object: &Object, key: &str, value: JsValue) -> Result<(), JsValue> {
    Reflect::set(object, &JsValue::from_str(key), &value).map(|_| ())
}

fn decoded_tile_to_js_value(width: u32, height: u32, rgba_bytes: Vec<u8>) -> Result<JsValue, JsValue> {
    let object = Object::new();
    let bytes = Uint8Array::from(rgba_bytes.as_slice());
    set_property(&object, "width", JsValue::from_f64(f64::from(width)))?;
    set_property(&object, "height", JsValue::from_f64(f64::from(height)))?;
    set_property(&object, "bytes", bytes.into())?;
    Ok(object.into())
}

fn encoded_tile_to_js_value(encoded_bytes: Vec<u8>) -> Result<JsValue, JsValue> {
    let object = Object::new();
    let bytes = Uint8Array::from(encoded_bytes.as_slice());
    set_property(&object, "bytes", bytes.into())?;
    Ok(object.into())
}

fn map_error(error: TerrainCodecError) -> JsValue {
    error.into_js_value()
}

#[wasm_bindgen]
pub fn wasm_decode_lzss_terrain_tile(
    compressed_bytes: &[u8],
    width: u32,
    height: u32,
) -> Result<JsValue, JsValue> {
    let decoded = decode_lzss_terrain_tile(compressed_bytes, width, height).map_err(map_error)?;
    decoded_tile_to_js_value(decoded.width, decoded.height, decoded.rgba_bytes)
}

#[wasm_bindgen]
pub fn wasm_encode_lzss_terrain_tile(
    rgba_bytes: &[u8],
    width: u32,
    height: u32,
) -> Result<JsValue, JsValue> {
    let encoded = encode_lzss_terrain_tile(rgba_bytes, width, height).map_err(map_error)?;
    encoded_tile_to_js_value(encoded.encoded_bytes)
}

#[wasm_bindgen]
pub fn wasm_decode_jpeg_terrain_tile(
    jpeg_bytes: &[u8],
    expected_width: u32,
    expected_height: u32,
) -> Result<JsValue, JsValue> {
    let decoded =
        decode_jpeg_terrain_tile(jpeg_bytes, expected_width, expected_height).map_err(map_error)?;
    decoded_tile_to_js_value(decoded.width, decoded.height, decoded.rgba_bytes)
}

#[wasm_bindgen]
pub fn wasm_encode_jpeg_terrain_tile(
    rgba_bytes: &[u8],
    width: u32,
    height: u32,
    quality: u8,
) -> Result<JsValue, JsValue> {
    let encoded =
        encode_jpeg_terrain_tile(rgba_bytes, width, height, quality).map_err(map_error)?;
    encoded_tile_to_js_value(encoded.encoded_bytes)
}

#[wasm_bindgen]
pub fn wasm_parse_nanosaur1_level(level_bytes: &[u8]) -> Result<JsValue, JsValue> {
    let parsed = parse_nanosaur1_level(level_bytes).map_err(map_error)?;
    serde_wasm_bindgen::to_value(&parsed)
        .map_err(|error| TerrainCodecError::decode_failed(error.to_string()).into_js_value())
}

#[wasm_bindgen]
pub fn wasm_compile_nanosaur1_level(
    raw_level_bytes: &[u8],
    edits: JsValue,
) -> Result<JsValue, JsValue> {
    let edits: Nanosaur1CompilePayload = serde_wasm_bindgen::from_value(edits)
        .map_err(|error| TerrainCodecError::invalid_input(error.to_string()).into_js_value())?;
    let compiled = compile_nanosaur1_level(raw_level_bytes, edits).map_err(map_error)?;
    encoded_tile_to_js_value(compiled)
}
