import { describe, it } from "vitest";
import { parseBG3D, type BG3DParseResult } from "@/modelParsers/parseBG3D";
import { unwrap } from "@/types/result";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("BG3D texture format info", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  
  const models = [
    { game: "ottomatic", name: "Blob" },
    { game: "ottomatic", name: "Otto" },
    { game: "cromagrally", name: "Viking" },
    { game: "bugdom2", name: "Ant" },
    { game: "nanosaur2", name: "brach" },
  ];
  
  models.forEach(({ game, name }) => {
    const bg3dPath = join(gamesRoot, game, "skeletons", `${name}.bg3d`);
    
    it(`${game}/${name}: texture formats`, () => {
      if (!existsSync(bg3dPath)) { console.warn("Skip: not found"); return; }
      const buf = bufferFromFile(bg3dPath);
      const parsed = unwrap(parseBG3D(buf));
      
      parsed.materials.forEach((mat, mi) => {
        console.log(`Material ${mi}: flags=${mat.flags}`);
        mat.textures.forEach((tex, ti) => {
          console.log(`  Tex ${ti}: ${tex.width}x${tex.height} srcFmt=${tex.srcPixelFormat} dstFmt=${tex.dstPixelFormat} bufSize=${tex.bufferSize} bytesPerPx=${tex.bufferSize/(tex.width*tex.height)}`);
        });
      });
    });
  });
});
