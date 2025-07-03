# BG3D File Format Documentation

BG3D is a chunk/tag-based binary 3D model format used by Pangea Software games (e.g., Bugdom, Nanosaur 2, Otto Matic, Billy Frontier). This document describes the structure and parsing logic of BG3D files as implemented in the original C source code.

---

## File Structure Overview

A BG3D file consists of:

1. **Header**: Identifies the file as BG3D and may contain versioning or other metadata.
2. **Tag-Based Data Blocks**: A sequence of tagged binary blocks, each representing a different type of 3D data (materials, geometry, groups, etc.).
3. **End Tag**: Marks the end of the file.

---

## Parsing Flow

1. **Read Header**

   - The file begins with a header (struct `BG3DHeaderType`).
   - The first 4 bytes must be the ASCII string `BG3D`.
   - If the header is invalid, parsing aborts.

2. **Main Tag Loop**

   - The parser reads a 4-byte tag (big-endian) and dispatches to a handler based on the tag value.
   - This continues until the `ENDFILE` tag is encountered.

3. **Tag Handlers**
   - Each tag is followed by a block of data specific to that tag type.
   - Data is read and stored in in-memory structures (materials, geometry, groups, etc.).
   - All multi-byte values are stored in big-endian format and must be byte-swapped on little-endian systems.

---

## Tag Types and Data Blocks

| Tag Name             | Data Follows                | Purpose                        |
| -------------------- | --------------------------- | ------------------------------ |
| MATERIALFLAGS        | 4 bytes (flags)             | Start new material             |
| MATERIALDIFFUSECOLOR | 4 floats (RGBA)             | Set material color             |
| TEXTUREMAP           | Texture header + pixels     | Add texture (possibly mipmaps) |
| GROUPSTART           | none                        | Start a new group              |
| GROUPEND             | none                        | End current group              |
| GEOMETRY             | Geometry header             | New geometry object            |
| VERTEXARRAY          | Array of OGLPoint3D         | Vertex positions               |
| NORMALARRAY          | Array of OGLVector3D        | Vertex normals                 |
| UVARRAY              | Array of OGLTextureCoord    | UV coordinates                 |
| COLORARRAY           | Array of OGLColorRGBA_Byte  | Vertex colors                  |
| TRIANGLEARRAY        | Array of MOTriangleIndecies | Triangle indices               |
| BOUNDINGBOX          | OGLBoundingBox              | Bounding box for geometry      |
| ENDFILE              | none                        | End of file                    |

---

## Example Parsing Logic (C Pseudocode)

```c
ReadBG3DHeader(refNum);
while (!done) {
    tag = ReadTag(refNum);
    switch (tag) {
        case MATERIALFLAGS: ReadMaterialFlags(refNum); break;
        case MATERIALDIFFUSECOLOR: ReadMaterialDiffuseColor(refNum); break;
        case TEXTUREMAP: ReadMaterialTextureMap(refNum); break;
        case GROUPSTART: ReadGroup(); break;
        case GROUPEND: EndGroup(); break;
        case GEOMETRY: ReadNewGeometry(refNum); break;
        case VERTEXARRAY: ReadVertexArray(refNum); break;
        case NORMALARRAY: ReadNormalArray(refNum); break;
        case UVARRAY: ReadUVArray(refNum); break;
        case COLORARRAY: ReadVertexColorArray(refNum); break;
        case TRIANGLEARRAY: ReadTriangleArray(refNum); break;
        case BOUNDINGBOX: ReadBoundingBox(refNum); break;
        case ENDFILE: done = true; break;
        default: FatalError("Unknown tag");
    }
}
```

---

## Endianness

- All multi-byte values (integers, floats) are stored in big-endian format.
- On little-endian systems, values must be byte-swapped after reading.

---

## Notes

- The format is extensible: new tags can be added for new features.
- Hierarchical grouping is supported via GROUPSTART/GROUPEND tags.
- Materials can have multiple mipmaps (multiple TEXTUREMAP tags per material).
- Geometry is typically stored as vertex arrays with associated normals, UVs, colors, and triangle indices.

---

## References

- See `bg3d.c` in the game source for the full parsing implementation.
- See also `bg3d.h` for tag constants and struct definitions.
