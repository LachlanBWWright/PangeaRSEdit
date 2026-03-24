import { readFileSync } from 'fs';
import { parse3DMFToMetaFile } from './src/modelParsers/threeDMF/parse3DMF';
import { metaFileToBG3DParseResult } from './src/modelParsers/threeDMF/convert';

const file = readFileSync('/home/lachl/documents/pangearsedit/frontend/public/games/bugdom1/skeletons/Slug.3dmf');
const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);

const parsed = parse3DMFToMetaFile(buffer);
if (parsed.isErr()) {
  console.error("Error parsing 3dmf:", parsed.error);
  process.exit(1);
}

const metaFile = parsed.value;
console.log("TopLevelGroups:", metaFile.numTopLevelGroups);
let i = 0;
for (const group of metaFile.topLevelGroups) {
  console.log(`Group ${i++}: meshes ${group.meshes.length}`);
  for (const mesh of group.meshes) {
    console.log(`  Mesh: ${mesh.numTriangles} tris, ${mesh.numPoints} points`);
    console.log(`  Diffuse:`, mesh.diffuseColor);
    console.log(`  BBox:`, mesh.bBox);
  }
}

const bg3dResult = metaFileToBG3DParseResult(metaFile);
if (bg3dResult.isErr()) {
  console.error("Error converting:", bg3dResult.error);
} else {
  console.log("Materials:", bg3dResult.value.materials.length);
  for (let i = 0; i < bg3dResult.value.materials.length; i++) {
     console.log(`Material ${i}: `, bg3dResult.value.materials[i].diffuseColor, bg3dResult.value.materials[i].flags);
  }
}
