# Skeleton Resource (.skeleton) File Format

This document describes the structure and resource types found in classic Mac OS skeleton resource files (as used in Pangea Software games like Nanosaur, Otto Matic, Bugdom, etc). These files store the animation and bone data for 3D characters, separate from the mesh geometry (which is typically stored in a .bg3d file).

---

## Overview

A `.skeleton` file is a Mac resource fork containing a set of resources, each with a specific type and ID. Each resource encodes a different aspect of the skeleton, such as the joint hierarchy, animation keyframes, events, and bounding boxes. The file is parsed by reading each resource and populating a `SkeletonDefType` structure in memory.

---

## Main Resource Types

| Resource Type | Typical ID | Purpose                                         |
| ------------- | ---------- | ----------------------------------------------- |
| 'Hedr'        | 1000       | Skeleton file header/metadata (version, counts) |
| 'Bone'        | 1000       | Bone hierarchy and joint definitions            |
| 'Anim'        | 1000+      | Animation keyframes for each animation          |
| 'Evnt'        | 1000+      | Animation event triggers (per animation)        |
| 'BBox'        | 1000       | Per-joint bounding boxes                        |
| 'Name'        | 1000       | Joint names (string list)                       |
| 'alis'        | 1000       | (Optional) Alias/resource links                 |

---

## Resource Type Details

### 'Hedr' (Header)

- **Purpose:** Contains version number, number of joints, number of animations, and other metadata.
- **Exact Structure (C):**
  ```c
  typedef struct
  {
      short version;         // File format version
      short numJoints;       // Number of joints
      short numAnims;        // Number of animations
      short numKeyframes;    // (optional) Total keyframes
      // ... may include additional fields depending on version
  } SkeletonFile_Header_Type;
  ```

### 'Bone' (Bones)

- **Purpose:** Defines the joint hierarchy, parent/child relationships, and default transforms for each joint.
- **Exact Structure (C):**
  ```c
  typedef struct
  {
      short parent;      // Parent joint index (-1 for root)
      float x, y, z;     // Default position
      float rx, ry, rz;  // Default rotation (Euler angles, radians)
      float sx, sy, sz;  // Default scale
      // ... may include joint name index or flags
  } SkeletonFile_Bone_Type;
  ```
  - The resource is an array of `numJoints` such records.

### 'Anim' (Animations)

- **Purpose:** Stores keyframes for each animation, for each joint.
- **Exact Structure (C):**
  ```c
  typedef struct
  {
      float time;        // Time (seconds or ticks)
      float x, y, z;     // Position
      float rx, ry, rz;  // Rotation (Euler angles)
      float sx, sy, sz;  // Scale
  } JointKeyframeType;
  ```
  - For each animation, for each joint, there is an array of keyframes.
  - The resource may be a 2D array: [joint][keyframe].

### 'Evnt' (Events)

- **Purpose:** Animation event triggers (e.g., sound, effects) for each animation.
- **Exact Structure (C):**
  ```c
  typedef struct
  {
      short type;    // Event type (enum)
      float time;    // Time in animation
      long value;    // Event value (meaning depends on type)
  } AnimEventType;
  ```
  - For each animation, there is an array of event records.

### 'BBox' (Bounding Boxes)

- **Purpose:** Per-joint bounding boxes for collision and culling.
- **Exact Structure (C):**
  ```c
  typedef struct
  {
      float minX, minY, minZ;
      float maxX, maxY, maxZ;
  } BBoxType;
  ```
  - The resource is an array of `numJoints` bounding boxes.

### 'Name' (Joint Names)

- **Purpose:** List of joint names as Pascal strings or a string list resource.
- **Exact Structure:**
  - Typically an array of Pascal strings (1-byte length prefix, then chars), one per joint.
  - Sometimes stored as a Mac OS STR# resource (string list).

### 'alis' (Alias/Links)

- **Purpose:** (Optional) May contain resource links or aliases for external references.
- **Exact Structure:**
  - Implementation-specific; may be a list of alias records or Mac OS Alias Manager data.
  - Not always present.

---

## Parsing Flow (Pseudocode)

```c
// Open resource fork of skeleton file
fRefNum = FSpOpenResFile(&fsSpec, fsRdPerm);
UseResFile(fRefNum);

// Allocate skeleton struct
skeleton = AllocPtr(sizeof(SkeletonDefType));

// Read resources
ReadDataFromSkeletonFile(skeleton, &fsSpec, skeletonType);
PrimeBoneData(skeleton);

// Close resource file
CloseResFile(fRefNum);
```

---

## Notes

- All multi-byte values are big-endian.
- The mesh geometry is stored separately (usually in a .bg3d file).
- The resource fork structure allows for extensibility and versioning.
- The same skeleton resource can be reused with different meshes.

---

## References

- See `File.c`, `SkeletonObj.c`, and `Bones.c` in the game source for full parsing logic.
- See also `structformats.h` for struct layouts and endianness.
