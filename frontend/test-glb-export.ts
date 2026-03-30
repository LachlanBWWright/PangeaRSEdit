import { readFileSync, writeFileSync } from 'fs';
import { parse3DMFToMetaFile } from './src/modelParsers/threeDMF/parse3DMF';
import { metaFileToBG3DParseResult } from './src/modelParsers/threeDMF/convert';
import { parseSkeletonRsrc } from './src/modelParsers/skeletonRsrc/parseSkeletonRsrcTS';
import { parseBG3DWithSkeletonResource } from './src/modelParsers/bg3dWithSkeleton';
import { bg3dParsedToGLTF } from './src/modelParsers/parsedBg3dGitfConverter';
import { NodeIO } from "@gltf-transform/core";

const bg3dFile = readFileSync('/home/lachl/documents/pangearsedit/frontend/public/games/bugdom1/skeletons/Slug.3dmf');
const bg3dBuffer = bg3dFile.buffer.slice(bg3dFile.byteOffset, bg3dFile.byteOffset + bg3dFile.byteLength);

const skelFile = readFileSync('/home/lachl/documents/pangearsedit/frontend/public/games/bugdom1/skeletons/Slug.skeleton.rsrc');
const skelBuffer = skelFile.buffer.slice(skelFile.byteOffset, skelFile.byteOffset + skelFile.byteLength);

async function main() {
  const skelParsed = await parseSkeletonRsrc(skelBuffer);
  const parsed = parseBG3DWithSkeletonResource(bg3dBuffer, skelParsed);
  
  if (parsed.isErr()) {
    console.error("Error", parsed.error);
    return;
  }
  
  const gltfDoc = await bg3dParsedToGLTF(parsed.value);
  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(gltfDoc);
  writeFileSync('slug-test.glb', glbBuffer);
  console.log("Wrote slug-test.glb");
}

main().catch(console.error);
