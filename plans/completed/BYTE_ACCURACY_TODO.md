# Byte Accuracy Improvement TODO List

## Current Status
- **Byte Accuracy**: 31.46% (Target: 99%+)
- **File Size**: 100% match (78,133 bytes) ✓
- **Semantic Accuracy**: 100% ✓
- **Structural Accuracy**: 100% ✓

## Analysis Complete ✓
**Root Cause Identified**: The test is NOT actually converting from glTF back to internal structures. It's using the original parsed data directly (line 215: `const roundtripBg3dParsed = originalBg3dParsed`).

This means:
1. Reserved fields ARE being preserved (through original data passthrough)
2. The 68% byte mismatch is NOT due to reserved fields
3. Need to investigate actual binary encoding differences

## New Investigation Plan

### Priority 1: Analyze Byte Mismatches
- [x] 1. First mismatch at 0x0001AB (within Bone struct at offset 52-84 = reserved fields section)
  - Offsets 0x0001AB-0x0001CF: 37 bytes all zeros in roundtrip vs non-zero in original
  - These ARE the reserved fields being zeroed!
  - Need to trace why despite passing original data

- [ ] 2. Second mismatch region 0x0001D6-0x0001DE (9 bytes)
  - Looks like name encoding issue
  - Original: `0xff 0xff 0x06 0x50...` vs Roundtrip: `0x06 0x50 0x65 0x6c...`
  - Pattern suggests Pascal string length prefix issue

- [ ] 3. Analyze pattern across all bones
  - If all 16 bones have same issue = systematic bug
  - Likely in convertBoneToBinary or bone data flow

### Priority 2: Fix Reserved Fields Flow
- [x] 4. Added reserved fields to BoneObj interface ✓
- [x] 5. Added reserved fields to BG3DBone interface ✓ 
- [x] 6. Verified parseBG3D preserves reserved fields ✓
- [ ] 7. Verify skeletonExport reads reserved fields from bones
- [ ] 8. Verify convertBoneToBinary writes reserved fields correctly

### Priority 3: Parent Bone Encoding
- [ ] 9. Original shows strange values: 854348, 919884
  - These look like corrupted/wrong values
  - Should be -1 or 0-15 (parent bone indices)
  - Need to check if big-endian vs little-endian issue

### Priority 4: Name Encoding Issue
- [ ] 10. Fix Pascal string encoding in bone names
  - Appears to have extra 0xFF bytes before name
  - Current code may not handle all cases

## Progress Tracking
- Started: 2025-11-10 05:26 UTC
- Current iteration: 2
- Last byte accuracy: 31.46%
- Root cause identified: Reserved fields being zeroed despite preservation in interfaces
