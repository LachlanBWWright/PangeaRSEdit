import { readFileSync } from 'fs';
import { parse3DMFToMetaFile } from './src/modelParsers/threeDMF/parse3DMF';
import { metaFileToBG3DParseResult } from './src/modelParsers/threeDMF/convert';
import { parseSkeletonRsrc } from './src/modelParsers/skeletonRsrc/parseSkeletonRsrcTS';
import { parseBG3DWithSkeletonResource } from './src/modelParsers/bg3dWithSkeleton';

const bg3dFile = readFileSync('/home/lachl/documents/pangearsedit/frontend/public/games/bugdom1/skeletons/Slug.3dmf');
const bg3dBuffer = bg3dFile.buffer.slice(bg3dFile.byteOffset, bg3dFile.byteOffset + bg3dFile.byteLength);

const skelFile = readFileSync('/home/lachl/documents/pangearsedit/frontend/public/games/bugdom1/skeletons/Slug.skeleton.rsrc');
const skelBuffer = skelFile.buffer.slice(skelFile.byteOffset, skelFile.byteOffset + skelFile.byteLength);

async function main() {
  const skelParsed = await parseSkeletonRsrc(skelBuffer);
  
  const parsed = parseBG3DWithSkeletonResource(bg3dBuffer, skelParsed);
  if (parsed.isErr()) {
    console.error("Error", parsed.error);
  } else {
    const result = parsed.value;
    console.log("Bones:", result.skeleton?.bones?.length);
    if (result.skeleton?.bones) {
      for (let i = 0; i < result.skeleton.bones.length; i++) {
        const bone = result.skeleton.bones[i];
        console.log(`Bone ${i}: '${bone.name}' parent=${bone.parentBone} points=${bone.numPointsAttachedToBone}`);
      }
    }
  }
}
main().catch(console.error);
