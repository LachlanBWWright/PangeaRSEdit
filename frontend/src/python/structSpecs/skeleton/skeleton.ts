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
//
// 'Trak', 'TrKd'  →  (No struct found; likely unused or legacy)
//
// 'Bnds'  →  OGLBoundingBox (ogl_support.h)
//   OGLPoint3D min; OGLPoint3D max; Boolean isEmpty;
//
// 'Nams'  →  char* (array of null-terminated strings)
//
export const skeletonSpecs = [
  "AnHd:33sxh:animName,numAnimEvents",
  // FourCC:struct_chars:names (comma separated)
  //BonN - Bone Normal
  "BonN:H+:normal",
  //BonP Point index array
  "BonP:H+:pointIndex",
  "Bone:i32s3fHH32x:parentBone,name,coordX,coordY,coordZ,numPointsAttachedToBone,numNormalsAttachedToBone",
  "Evnt:hBB+:time,type,value",

  //Header has lots of blank/padding after? Cast to 8 bype struct but 84 bytes in practice
  "Hedr:hhhh76x:version,numAnims,numJoints,num3DMFLimbs",

  /* 
typedef struct
{
	int32_t		tick;					// time at which this state exists                                
	int32_t		accelerationMode;		// mode of in/out acceleration
	OGLPoint3D	coord;					// current 3D coords of joint (relative to link)              (x y z)
	OGLVector3D	rotation;				// current rotation values of joint (relative to link)          (x y z)
	OGLVector3D	scale;					// current scale values of joint mesh                            (x y z)
}JointKeyframeType;
*/
  "KeyF:ii3f3f3f+:tick,accelerationMode,coordX,coordY,coordZ,rotationX,rotationY,rotationZ,scaleX,scaleY,scaleZ",

  //RelP Point relative offsets
  "RelP:3f+:relOffsetX,relOffsetY,relOffsetZ",

  // NumK - Number of keyframes in each joint for each animation (Signed Char)
  "NumK:b+:numKeyFrames", // 40 bytes, 40 joints max

  "Nams:c+:names", // variable-length null-terminated strings

  //Also Alis field for bg3d/3dmf?
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
