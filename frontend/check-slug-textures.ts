import { readFileSync } from 'fs';
import { parse3DMFToMetaFile } from './src/modelParsers/threeDMF/parse3DMF';

const file = readFileSync('/home/lachl/documents/pangearsedit/frontend/public/games/bugdom1/skeletons/Slug.3dmf');
const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);

const parsed = parse3DMFToMetaFile(buffer);
if (parsed.isErr()) {
  console.error("Error parsing 3dmf:", parsed.error);
  process.exit(1);
}

const metaFile = parsed.value;
console.log("Textures:", metaFile.textures.length);
metaFile.textures.forEach((tex, i) => {
  if (tex.pixmap) {
    console.log(`Texture ${i}: pixelType=${tex.pixmap.pixelType}`);
  } else {
    console.log(`Texture ${i}: no pixmap`);
  }
});
