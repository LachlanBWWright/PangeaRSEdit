# Otto Matic and Later Games: Extended Skeleton Resource Structures

Some later Pangea games (Otto Matic, Bugdom 2, Cro-Mag Rally, Billy Frontier, Nanosaur 2) use an extended skeleton resource format with 32-bit fields, explicit arrays, and more detailed animation/event structures. Below are the exact C struct definitions from Otto Matic and similar games, with explanations.

---

## `Hedr` — Skeleton File Header (Otto Matic)

```c
typedef struct
{
    long    numBones;       // Number of bones in the skeleton
    long    numAnims;       // Number of animations
    long    numKeyFrames;   // Total number of keyframes (across all anims)
    long    numAnimEvents;  // Total number of animation events
} SkeletonFile_Header_Type;
```

**Explanation:**

- `numBones`: Number of bones (joints) in the skeleton.
- `numAnims`: Number of animation sequences.
- `numKeyFrames`: Total number of keyframes for all animations.
- `numAnimEvents`: Total number of animation events (may be zero).

---

## `Bone` — Bone Definitions (Otto Matic)

```c
typedef struct
{
    char    name[32];           // Name of the bone (null-terminated string)
    long    parentBone;         // Index of parent bone (-1 if root)
    float   relX, relY, relZ;   // Position relative to parent
    float   relRotX, relRotY, relRotZ; // Rotation relative to parent (degrees)
    long    numPointsAttached;  // Number of mesh points attached to this bone
    long    attachedPointList[100]; // Indices of attached mesh points (MAX_POINTS_ON_BONE)
} File_BoneDefinitionType;
```

**Explanation:**

- `name`: Bone name (up to 31 chars + null terminator).
- `parentBone`: Index of the parent bone, or -1 for the root bone.
- `relX`, `relY`, `relZ`: Local position offset from parent.
- `relRotX`, `relRotY`, `relRotZ`: Local rotation offset from parent (Euler angles, degrees).
- `numPointsAttached`: Number of mesh vertices attached to this bone.
- `attachedPointList`: Indices of attached mesh points (array size is fixed, unused entries are ignored).

---

## `Anim` — Animation Header (Otto Matic)

```c
typedef struct
{
    char    name[32];           // Name of the animation (null-terminated string)
    long    numKeyFrames;       // Number of keyframes in this animation
    long    firstKeyFrameIndex; // Index into the global keyframe array
    float   duration;           // Duration of the animation (seconds)
    long    numAnimEvents;      // Number of events in this animation
    long    firstEventIndex;    // Index into the global event array
} SkeletonFile_AnimHeader_Type;
```

**Explanation:**

- `name`: Animation name (up to 31 chars + null terminator).
- `numKeyFrames`: Number of keyframes in this animation.
- `firstKeyFrameIndex`: Index of the first keyframe for this animation (in the global keyframe array).
- `duration`: Total duration of the animation in seconds.
- `numAnimEvents`: Number of animation events (may be zero).
- `firstEventIndex`: Index of the first event for this animation (in the global event array).

---

## `KeyF` — Animation Keyframe (Otto Matic)

```c
#define MAX_JOINTS 20

typedef struct
{
    float   time;                   // Time (seconds) of this keyframe
    float   jointPositions[MAX_JOINTS][6]; // For each joint: [X, Y, Z, rotX, rotY, rotZ]
} SkeletonFile_KeyFrame_Type;
```

**Explanation:**

- `time`: The time (in seconds) this keyframe occurs at.
- `jointPositions`: For each joint (bone), an array of 6 floats: position (X, Y, Z) and rotation (rotX, rotY, rotZ).
- `MAX_JOINTS` is typically 20, but may vary by game/version.

---

## `Evnt` — Animation Event (Otto Matic, Optional)

```c
#define MAX_EVENT_STRING_LEN 32

typedef struct
{
    float   time;                   // Time (seconds) when the event occurs
    char    eventType[MAX_EVENT_STRING_LEN]; // Event type string (e.g., "footstep")
    char    eventParam[MAX_EVENT_STRING_LEN]; // Event parameter string (e.g., "left")
} SkeletonFile_AnimEvent_Type;
```

**Explanation:**

- `time`: When the event occurs (in seconds, relative to animation start).
- `eventType`: String describing the event type (e.g., "footstep").
- `eventParam`: Additional parameter (e.g., which foot).

---

## `BBox` — Bounding Box (Otto Matic, Optional)

```c
typedef struct
{
    float   minX, minY, minZ;
    float   maxX, maxY, maxZ;
} SkeletonFile_BBox_Type;
```

**Explanation:**

- `minX`, `minY`, `minZ`: Minimum coordinates of the bounding box.
- `maxX`, `maxY`, `maxZ`: Maximum coordinates of the bounding box.

---

## `Name` — Name Table (Otto Matic, Optional)

```c
#define MAX_NAME_LENGTH 32

typedef struct
{
    char    names[][MAX_NAME_LENGTH]; // Array of null-terminated strings
} SkeletonFile_NameTable_Type;
```

**Explanation:**

- `names`: Array of names (e.g., bone names, animation names), each up to 31 chars + null terminator.

---

**Notes:**

- All fields are stored in big-endian byte order (as on classic Mac OS).
- Structures may be packed; padding/alignment may differ by compiler. When parsing, use the exact field sizes and order as shown above.
- Arrays with fixed maximum sizes (e.g., `attachedPointList[100]`) may have unused entries.
