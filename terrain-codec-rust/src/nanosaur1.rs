use crate::errors::{TerrainCodecError, TerrainCodecResult};
use serde::{Deserialize, Serialize};

const HEADER_SIZE: usize = 40;
const HMTILE_SIDE: usize = 32;
const HMTILE_BYTES: usize = HMTILE_SIDE * HMTILE_SIDE;
const OBJECT_ENTRY_BYTES: usize = 20;
const TILE_ATTRIB_BYTES: usize = 8;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Nanosaur1LevelHeader {
    pub texture_layer_offset: i32,
    pub heightmap_layer_offset: i32,
    pub path_layer_offset: i32,
    pub object_list_offset: i32,
    pub unknown1: i32,
    pub heightmap_tiles_offset: i32,
    pub unknown2: i32,
    pub width: u16,
    pub depth: u16,
    pub texture_attrib_offset: i32,
    pub tile_anim_data_offset: i32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerrainItemEntry {
    pub x: u16,
    pub y: u16,
    pub r#type: u16,
    pub parm: [u8; 4],
    pub flags: u16,
    pub prev_item_idx: i32,
    pub next_item_idx: i32,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TileAttribEntry {
    pub bits: u16,
    pub parm0: i16,
    pub parm1: u8,
    pub parm2: u8,
    pub undefined: i16,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedNanosaur1Level {
    pub header: Nanosaur1LevelHeader,
    pub texture_layer: Vec<u16>,
    pub heightmap_layer: Option<Vec<u16>>,
    pub path_layer: Option<Vec<u16>>,
    pub object_list: Vec<TerrainItemEntry>,
    pub texture_attributes: Vec<TileAttribEntry>,
    pub heightmap_tiles: Option<Vec<Vec<u8>>>,
    pub heightmap_padding: Option<Vec<u8>>,
    pub tile_anim_data: Option<Vec<u8>>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Nanosaur1CompilePayload {
    pub texture_layer: Option<Vec<u16>>,
    pub object_list: Option<Vec<TerrainItemEntry>>,
    pub texture_attributes: Option<Vec<TileAttribEntry>>,
}

fn read_i32_be(bytes: &[u8], offset: usize) -> TerrainCodecResult<i32> {
    let end = offset
        .checked_add(4)
        .ok_or_else(|| TerrainCodecError::invalid_input("Offset overflow while reading i32"))?;
    let slice = bytes
        .get(offset..end)
        .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading i32"))?;
    Ok(i32::from_be_bytes([slice[0], slice[1], slice[2], slice[3]]))
}

fn read_i16_be(bytes: &[u8], offset: usize) -> TerrainCodecResult<i16> {
    let end = offset
        .checked_add(2)
        .ok_or_else(|| TerrainCodecError::invalid_input("Offset overflow while reading i16"))?;
    let slice = bytes
        .get(offset..end)
        .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading i16"))?;
    Ok(i16::from_be_bytes([slice[0], slice[1]]))
}

fn read_u16_be(bytes: &[u8], offset: usize) -> TerrainCodecResult<u16> {
    let end = offset
        .checked_add(2)
        .ok_or_else(|| TerrainCodecError::invalid_input("Offset overflow while reading u16"))?;
    let slice = bytes
        .get(offset..end)
        .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading u16"))?;
    Ok(u16::from_be_bytes([slice[0], slice[1]]))
}

fn write_i32_be(target: &mut [u8], offset: usize, value: i32) -> TerrainCodecResult<()> {
    let end = offset
        .checked_add(4)
        .ok_or_else(|| TerrainCodecError::encode_failed("Offset overflow while writing i32"))?;
    let range = target
        .get_mut(offset..end)
        .ok_or_else(|| TerrainCodecError::encode_failed("Unexpected EOF while writing i32"))?;
    range.copy_from_slice(&value.to_be_bytes());
    Ok(())
}

fn write_i16_be(target: &mut [u8], offset: usize, value: i16) -> TerrainCodecResult<()> {
    let end = offset
        .checked_add(2)
        .ok_or_else(|| TerrainCodecError::encode_failed("Offset overflow while writing i16"))?;
    let range = target
        .get_mut(offset..end)
        .ok_or_else(|| TerrainCodecError::encode_failed("Unexpected EOF while writing i16"))?;
    range.copy_from_slice(&value.to_be_bytes());
    Ok(())
}

fn write_u16_be(target: &mut [u8], offset: usize, value: u16) -> TerrainCodecResult<()> {
    let end = offset
        .checked_add(2)
        .ok_or_else(|| TerrainCodecError::encode_failed("Offset overflow while writing u16"))?;
    let range = target
        .get_mut(offset..end)
        .ok_or_else(|| TerrainCodecError::encode_failed("Unexpected EOF while writing u16"))?;
    range.copy_from_slice(&value.to_be_bytes());
    Ok(())
}

fn offset_to_usize(offset: i32, context: &str) -> TerrainCodecResult<Option<usize>> {
    if offset <= 0 {
        return Ok(None);
    }
    usize::try_from(offset)
        .map(Some)
        .map_err(|_| TerrainCodecError::invalid_input(format!("{context} offset exceeds host limits")))
}

fn read_u16_layer(bytes: &[u8], offset: usize, count: usize) -> TerrainCodecResult<Vec<u16>> {
    let mut values = Vec::with_capacity(count);
    for index in 0..count {
        let entry_offset = offset
            .checked_add(
                index
                    .checked_mul(2)
                    .ok_or_else(|| TerrainCodecError::invalid_input("Layer index overflow"))?,
            )
            .ok_or_else(|| TerrainCodecError::invalid_input("Layer offset overflow"))?;
        values.push(read_u16_be(bytes, entry_offset)?);
    }
    Ok(values)
}

fn parse_object_list(bytes: &[u8], object_list_offset: usize) -> TerrainCodecResult<Vec<TerrainItemEntry>> {
    let count = read_i32_be(bytes, object_list_offset)?;
    if count <= 0 {
        return Ok(Vec::new());
    }
    let count = usize::try_from(count)
        .map_err(|_| TerrainCodecError::invalid_input("Object list count exceeds host limits"))?;
    let mut result = Vec::with_capacity(count);
    let base = object_list_offset
        .checked_add(4)
        .ok_or_else(|| TerrainCodecError::invalid_input("Object list base overflow"))?;
    for index in 0..count {
        let entry_offset = base
            .checked_add(
                index
                    .checked_mul(OBJECT_ENTRY_BYTES)
                    .ok_or_else(|| TerrainCodecError::invalid_input("Object index overflow"))?,
            )
            .ok_or_else(|| TerrainCodecError::invalid_input("Object offset overflow"))?;
        let parm0 = bytes
            .get(entry_offset + 6)
            .copied()
            .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading object parm0"))?;
        let parm1 = bytes
            .get(entry_offset + 7)
            .copied()
            .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading object parm1"))?;
        let parm2 = bytes
            .get(entry_offset + 8)
            .copied()
            .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading object parm2"))?;
        let parm3 = bytes
            .get(entry_offset + 9)
            .copied()
            .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading object parm3"))?;
        result.push(TerrainItemEntry {
            x: read_u16_be(bytes, entry_offset)?,
            y: read_u16_be(bytes, entry_offset + 2)?,
            r#type: read_u16_be(bytes, entry_offset + 4)?,
            parm: [parm0, parm1, parm2, parm3],
            flags: read_u16_be(bytes, entry_offset + 10)?,
            prev_item_idx: read_i32_be(bytes, entry_offset + 12)?,
            next_item_idx: read_i32_be(bytes, entry_offset + 16)?,
        });
    }
    Ok(result)
}

fn parse_texture_attributes(
    bytes: &[u8],
    texture_attrib_offset: usize,
    tile_anim_data_offset: usize,
) -> TerrainCodecResult<Vec<TileAttribEntry>> {
    if tile_anim_data_offset <= texture_attrib_offset {
        return Ok(Vec::new());
    }
    let byte_length = tile_anim_data_offset
        .checked_sub(texture_attrib_offset)
        .ok_or_else(|| TerrainCodecError::invalid_input("Texture attrib range underflow"))?;
    let count = byte_length / TILE_ATTRIB_BYTES;
    let mut result = Vec::with_capacity(count);
    for index in 0..count {
        let entry_offset = texture_attrib_offset
            .checked_add(
                index
                    .checked_mul(TILE_ATTRIB_BYTES)
                    .ok_or_else(|| TerrainCodecError::invalid_input("Texture attrib index overflow"))?,
            )
            .ok_or_else(|| TerrainCodecError::invalid_input("Texture attrib offset overflow"))?;
        let parm1 = bytes
            .get(entry_offset + 4)
            .copied()
            .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading tile attrib parm1"))?;
        let parm2 = bytes
            .get(entry_offset + 5)
            .copied()
            .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading tile attrib parm2"))?;
        result.push(TileAttribEntry {
            bits: read_u16_be(bytes, entry_offset)?,
            parm0: read_i16_be(bytes, entry_offset + 2)?,
            parm1,
            parm2,
            undefined: read_i16_be(bytes, entry_offset + 6)?,
        });
    }
    Ok(result)
}

fn parse_heightmap_tiles_and_padding(
    bytes: &[u8],
    heightmap_tiles_offset: usize,
    texture_attrib_offset: usize,
) -> TerrainCodecResult<(Option<Vec<Vec<u8>>>, Option<Vec<u8>>)> {
    if texture_attrib_offset <= heightmap_tiles_offset {
        return Ok((None, None));
    }
    let byte_length = texture_attrib_offset
        .checked_sub(heightmap_tiles_offset)
        .ok_or_else(|| TerrainCodecError::invalid_input("Heightmap tiles range underflow"))?;
    let tile_count = byte_length / HMTILE_BYTES;
    if tile_count == 0 {
        return Ok((None, None));
    }
    let mut tiles = Vec::with_capacity(tile_count);
    for index in 0..tile_count {
        let tile_offset = heightmap_tiles_offset
            .checked_add(
                index
                    .checked_mul(HMTILE_BYTES)
                    .ok_or_else(|| TerrainCodecError::invalid_input("Heightmap tile index overflow"))?,
            )
            .ok_or_else(|| TerrainCodecError::invalid_input("Heightmap tile offset overflow"))?;
        let tile_end = tile_offset
            .checked_add(HMTILE_BYTES)
            .ok_or_else(|| TerrainCodecError::invalid_input("Heightmap tile end overflow"))?;
        let tile = bytes
            .get(tile_offset..tile_end)
            .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading heightmap tile"))?;
        tiles.push(tile.to_vec());
    }
    let consumed = tile_count
        .checked_mul(HMTILE_BYTES)
        .ok_or_else(|| TerrainCodecError::invalid_input("Heightmap tile byte count overflow"))?;
    let padding = if consumed < byte_length {
        let padding_offset = heightmap_tiles_offset
            .checked_add(consumed)
            .ok_or_else(|| TerrainCodecError::invalid_input("Heightmap padding offset overflow"))?;
        let padding_end = heightmap_tiles_offset
            .checked_add(byte_length)
            .ok_or_else(|| TerrainCodecError::invalid_input("Heightmap padding end overflow"))?;
        Some(
            bytes
                .get(padding_offset..padding_end)
                .ok_or_else(|| TerrainCodecError::invalid_input("Unexpected EOF while reading heightmap padding"))?
                .to_vec(),
        )
    } else {
        None
    };
    Ok((Some(tiles), padding))
}

pub fn parse_nanosaur1_level(bytes: &[u8]) -> TerrainCodecResult<ParsedNanosaur1Level> {
    if bytes.len() < HEADER_SIZE {
        return Err(TerrainCodecError::invalid_input(format!(
            "Expected at least {HEADER_SIZE} bytes for a Nanosaur 1 level header, received {}",
            bytes.len()
        )));
    }

    let header = Nanosaur1LevelHeader {
        texture_layer_offset: read_i32_be(bytes, 0)?,
        heightmap_layer_offset: read_i32_be(bytes, 4)?,
        path_layer_offset: read_i32_be(bytes, 8)?,
        object_list_offset: read_i32_be(bytes, 12)?,
        unknown1: read_i32_be(bytes, 16)?,
        heightmap_tiles_offset: read_i32_be(bytes, 20)?,
        unknown2: read_i32_be(bytes, 24)?,
        width: read_u16_be(bytes, 28)?,
        depth: read_u16_be(bytes, 30)?,
        texture_attrib_offset: read_i32_be(bytes, 32)?,
        tile_anim_data_offset: read_i32_be(bytes, 36)?,
    };

    let layer_size = usize::from(header.width)
        .checked_mul(usize::from(header.depth))
        .ok_or_else(|| TerrainCodecError::invalid_input("Terrain layer size overflow"))?;

    let texture_layer = match offset_to_usize(header.texture_layer_offset, "texture layer")? {
        Some(offset) => read_u16_layer(bytes, offset, layer_size)?,
        None => Vec::new(),
    };
    let heightmap_layer = match offset_to_usize(header.heightmap_layer_offset, "heightmap layer")? {
        Some(offset) => Some(read_u16_layer(bytes, offset, layer_size)?),
        None => None,
    };
    let path_layer = match offset_to_usize(header.path_layer_offset, "path layer")? {
        Some(offset) => Some(read_u16_layer(bytes, offset, layer_size)?),
        None => None,
    };

    let object_list = match offset_to_usize(header.object_list_offset, "object list")? {
        Some(offset) => parse_object_list(bytes, offset)?,
        None => Vec::new(),
    };

    let texture_attributes = match (
        offset_to_usize(header.texture_attrib_offset, "texture attrib")?,
        offset_to_usize(header.tile_anim_data_offset, "tile anim data")?,
    ) {
        (Some(texture_attrib_offset), Some(tile_anim_data_offset)) => {
            parse_texture_attributes(bytes, texture_attrib_offset, tile_anim_data_offset)?
        }
        _ => Vec::new(),
    };

    let (heightmap_tiles, heightmap_padding) = match (
        offset_to_usize(header.heightmap_tiles_offset, "heightmap tiles")?,
        offset_to_usize(header.texture_attrib_offset, "texture attrib")?,
    ) {
        (Some(heightmap_tiles_offset), Some(texture_attrib_offset)) => {
            parse_heightmap_tiles_and_padding(bytes, heightmap_tiles_offset, texture_attrib_offset)?
        }
        _ => (None, None),
    };

    let tile_anim_data = match offset_to_usize(header.tile_anim_data_offset, "tile anim data")? {
        Some(offset) if offset < bytes.len() => Some(bytes[offset..].to_vec()),
        _ => None,
    };

    Ok(ParsedNanosaur1Level {
        header,
        texture_layer,
        heightmap_layer,
        path_layer,
        object_list,
        texture_attributes,
        heightmap_tiles,
        heightmap_padding,
        tile_anim_data,
    })
}

pub fn compile_nanosaur1_level(
    raw_level_bytes: &[u8],
    edits: Nanosaur1CompilePayload,
) -> TerrainCodecResult<Vec<u8>> {
    let parsed = parse_nanosaur1_level(raw_level_bytes)?;
    let header = &parsed.header;

    let map_width = usize::from(header.width);
    let map_height = usize::from(header.depth);
    let layer_size = map_width
        .checked_mul(map_height)
        .ok_or_else(|| TerrainCodecError::encode_failed("Terrain layer size overflow"))?;

    let tile_anim_data_offset = offset_to_usize(header.tile_anim_data_offset, "tile anim data")?
        .ok_or_else(|| TerrainCodecError::encode_failed("Missing tile animation offset"))?;
    let tile_anim_len = parsed.tile_anim_data.as_ref().map_or(0usize, |bytes| bytes.len());
    let total_size = tile_anim_data_offset
        .checked_add(tile_anim_len)
        .ok_or_else(|| TerrainCodecError::encode_failed("Compiled file size overflow"))?;
    let mut buffer = vec![0u8; total_size];

    write_i32_be(&mut buffer, 0, header.texture_layer_offset)?;
    write_i32_be(&mut buffer, 4, header.heightmap_layer_offset)?;
    write_i32_be(&mut buffer, 8, header.path_layer_offset)?;
    write_i32_be(&mut buffer, 12, header.object_list_offset)?;
    write_i32_be(&mut buffer, 16, header.unknown1)?;
    write_i32_be(&mut buffer, 20, header.heightmap_tiles_offset)?;
    write_i32_be(&mut buffer, 24, header.unknown2)?;
    write_u16_be(&mut buffer, 28, header.width)?;
    write_u16_be(&mut buffer, 30, header.depth)?;
    write_i32_be(&mut buffer, 32, header.texture_attrib_offset)?;
    write_i32_be(&mut buffer, 36, header.tile_anim_data_offset)?;

    if let Some(texture_layer_offset) = offset_to_usize(header.texture_layer_offset, "texture layer")? {
        let texture_layer = if edits
            .texture_layer
            .as_ref()
            .is_some_and(|values| values.len() == layer_size)
        {
            edits.texture_layer.as_ref().expect("checked above")
        } else {
            &parsed.texture_layer
        };
        for (index, value) in texture_layer.iter().enumerate() {
            let entry_offset = texture_layer_offset
                .checked_add(index * 2)
                .ok_or_else(|| TerrainCodecError::encode_failed("Texture layer offset overflow"))?;
            write_u16_be(&mut buffer, entry_offset, *value)?;
        }
    }

    if let Some(heightmap_layer_offset) =
        offset_to_usize(header.heightmap_layer_offset, "heightmap layer")?
    {
        if let Some(heightmap_layer) = parsed.heightmap_layer.as_ref() {
            for (index, value) in heightmap_layer.iter().enumerate() {
                let entry_offset = heightmap_layer_offset
                    .checked_add(index * 2)
                    .ok_or_else(|| {
                        TerrainCodecError::encode_failed("Heightmap layer offset overflow")
                    })?;
                write_u16_be(&mut buffer, entry_offset, *value)?;
            }
        }
    }

    if let Some(path_layer_offset) = offset_to_usize(header.path_layer_offset, "path layer")? {
        if let Some(path_layer) = parsed.path_layer.as_ref() {
            for (index, value) in path_layer.iter().enumerate() {
                let entry_offset = path_layer_offset
                    .checked_add(index * 2)
                    .ok_or_else(|| TerrainCodecError::encode_failed("Path layer offset overflow"))?;
                write_u16_be(&mut buffer, entry_offset, *value)?;
            }
        }
    }

    if let Some(object_list_offset) = offset_to_usize(header.object_list_offset, "object list")? {
        let object_list = if edits
            .object_list
            .as_ref()
            .is_some_and(|items| !items.is_empty())
        {
            edits.object_list.as_ref().expect("checked above")
        } else {
            &parsed.object_list
        };
        let object_count = i32::try_from(object_list.len())
            .map_err(|_| TerrainCodecError::encode_failed("Object list count exceeds i32"))?;
        write_i32_be(&mut buffer, object_list_offset, object_count)?;
        let mut write_ptr = object_list_offset
            .checked_add(4)
            .ok_or_else(|| TerrainCodecError::encode_failed("Object list write pointer overflow"))?;
        for item in object_list {
            write_u16_be(&mut buffer, write_ptr, item.x)?;
            write_u16_be(&mut buffer, write_ptr + 2, item.y)?;
            write_u16_be(&mut buffer, write_ptr + 4, item.r#type)?;
            let parm_target = buffer.get_mut(write_ptr + 6..write_ptr + 10).ok_or_else(|| {
                TerrainCodecError::encode_failed("Unexpected EOF while writing object parms")
            })?;
            parm_target.copy_from_slice(&item.parm);
            write_u16_be(&mut buffer, write_ptr + 10, item.flags)?;
            write_i32_be(&mut buffer, write_ptr + 12, item.prev_item_idx)?;
            write_i32_be(&mut buffer, write_ptr + 16, item.next_item_idx)?;
            write_ptr = write_ptr.checked_add(OBJECT_ENTRY_BYTES).ok_or_else(|| {
                TerrainCodecError::encode_failed("Object list write pointer overflow")
            })?;
        }
    }

    if let Some(heightmap_tiles_offset) =
        offset_to_usize(header.heightmap_tiles_offset, "heightmap tiles")?
    {
        if let Some(heightmap_tiles) = parsed.heightmap_tiles.as_ref() {
            let mut write_ptr = heightmap_tiles_offset;
            for tile in heightmap_tiles {
                let tile_end = write_ptr
                    .checked_add(tile.len())
                    .ok_or_else(|| TerrainCodecError::encode_failed("Heightmap tile write overflow"))?;
                let target = buffer.get_mut(write_ptr..tile_end).ok_or_else(|| {
                    TerrainCodecError::encode_failed(
                        "Unexpected EOF while writing heightmap tile bytes",
                    )
                })?;
                target.copy_from_slice(tile);
                write_ptr = tile_end;
            }
            if let Some(padding) = parsed.heightmap_padding.as_ref() {
                let padding_end = write_ptr.checked_add(padding.len()).ok_or_else(|| {
                    TerrainCodecError::encode_failed("Heightmap padding write overflow")
                })?;
                let target = buffer.get_mut(write_ptr..padding_end).ok_or_else(|| {
                    TerrainCodecError::encode_failed(
                        "Unexpected EOF while writing heightmap padding bytes",
                    )
                })?;
                target.copy_from_slice(padding);
            }
        }
    }

    if let Some(texture_attrib_offset) = offset_to_usize(header.texture_attrib_offset, "texture attrib")?
    {
        let attribs = if edits
            .texture_attributes
            .as_ref()
            .is_some_and(|values| values.len() == parsed.texture_attributes.len())
        {
            edits.texture_attributes.as_ref().expect("checked above")
        } else {
            &parsed.texture_attributes
        };
        let mut write_ptr = texture_attrib_offset;
        for attr in attribs {
            write_u16_be(&mut buffer, write_ptr, attr.bits)?;
            write_i16_be(&mut buffer, write_ptr + 2, attr.parm0)?;
            let parm1_slot = buffer.get_mut(write_ptr + 4).ok_or_else(|| {
                TerrainCodecError::encode_failed("Unexpected EOF while writing tile attrib parm1")
            })?;
            *parm1_slot = attr.parm1;
            let parm2_slot = buffer.get_mut(write_ptr + 5).ok_or_else(|| {
                TerrainCodecError::encode_failed("Unexpected EOF while writing tile attrib parm2")
            })?;
            *parm2_slot = attr.parm2;
            write_i16_be(&mut buffer, write_ptr + 6, attr.undefined)?;
            write_ptr = write_ptr
                .checked_add(TILE_ATTRIB_BYTES)
                .ok_or_else(|| TerrainCodecError::encode_failed("Texture attrib write overflow"))?;
        }
    }

    if let Some(tile_anim_data) = parsed.tile_anim_data.as_ref() {
        let start = tile_anim_data_offset;
        let end = start
            .checked_add(tile_anim_data.len())
            .ok_or_else(|| TerrainCodecError::encode_failed("Tile anim write overflow"))?;
        let target = buffer.get_mut(start..end).ok_or_else(|| {
            TerrainCodecError::encode_failed("Unexpected EOF while writing tile anim data")
        })?;
        target.copy_from_slice(tile_anim_data);
    }

    Ok(buffer)
}

