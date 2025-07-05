// Skeleton resource struct specs (from C headers in ottomatic/src/Headers)
//
// 'Hedr'  →  SkeletonFile_Header_Type (file.h)
//   int16_t version; int16_t numAnims; int16_t numJoints; int16_t num3DMFLimbs;
//
// 'Bone'  →  File_BoneDefinitionType (file.h)
//   int32_t parentBone; unsigned char name[32]; OGLPoint3D coord; uint16_t numPointsAttachedToBone; uint16_t numNormalsAttachedToBone; uint32_t reserved[8];
//
// 'AnHd'  →  SkeletonFile_AnimHeader_Type (file.h)
//   Str32 animName; int16_t numAnimEvents;
//
// 'Evnt'  →  AnimEventType (structs.h)
//   short time; Byte type; Byte value;
//
// 'KeyF'  →  JointKeyFrameHeader (structs.h)
//   signed char numKeyFrames[MAX_ANIMS]; JointKeyframeType **keyFrames;
//
// 'KeyD'  →  JointKeyframeType (structs.h)
//   int32_t tick; int32_t accelerationMode; OGLPoint3D coord; OGLVector3D rotation; OGLVector3D scale;
//
// 'Trak', 'TrKd'  →  (No struct found; likely unused or legacy)
//
// 'Bnds'  →  OGLBoundingBox (ogl_support.h)
//   OGLPoint3D min; OGLPoint3D max; Boolean isEmpty;
//
// 'Nams'  →  char* (array of null-terminated strings)
//
export const skeletonSpecs = [
  // FourCC:struct_chars:names (comma separated)
  "Hedr:hhhh:version,numAnims,numJoints,num3DMFLimbs",
  //BonN - Bone Normal
  "BonN:H+:normal",
  //BonP Point index array
  "BonP:H+:pointIndex",
  "Bone:i32s3fHH8I:parentBone,name,coordX,coordY,coordZ,numPointsAttachedToBone,numNormalsAttachedToBone,reserved0,reserved1,reserved2,reserved3,reserved4,reserved5,reserved6,reserved7",
  "AnHd:33sxh:animName,numAnimEvents",
  "Evnt:hBB+:time,type,value",
  "KeyF:40b:numKeyFrames[40]",
  "KeyD:ii3f3f3f:tick,accelerationMode,coordX,coordY,coordZ,rotationX,rotationY,rotationZ,scaleX,scaleY,scaleZ",
  "Bnds:3f3fB:minX,minY,minZ,maxX,maxY,maxZ,isEmpty",
  "Nams:c+:names", // variable-length null-terminated strings
];

/* 
  //Struct specifications 
  //https://docs.python.org/3/library/struct.html#format-characters

- 'Hedr'  →  SkeletonFileHeader*
- 'Bone'  →  SkeletonFileBoneDefinition*
- 'AnHd'  →  SkeletonFileAnimHeader*
- 'Evnt'  →  SkeletonFileAnimEvent*
- 'KeyF'  →  SkeletonFileKeyFrameHeader*
- 'KeyD'  →  SkeletonFileKeyFrameData*
- 'Trak'  →  SkeletonFileTrackHeader*
- 'TrKd'  →  SkeletonFileTrackData*
- 'Bnds'  →  SkeletonFileBoundingBox*
- 'Nams'  →  char* (array of null-terminated strings)
  */
