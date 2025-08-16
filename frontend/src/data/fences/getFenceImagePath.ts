import { Game, GlobalsInterface } from "../globals/globals";

/**
 * Gets the asset path for a fence image based on game type and fence type
 */
export function getFenceImagePath(globals: GlobalsInterface, fenceType: number): string {
  switch (globals.GAME_TYPE) {
    case Game.OTTO_MATIC:
      return `assets/ottoMatic/fences/fence${String(fenceType).padStart(3, "0")}.png`;
    
    case Game.BUGDOM:
      return `assets/bugdom/fences/${2000 + fenceType}.jpg`;
    
    case Game.BUGDOM_2:
      return `assets/bugdom2/fences/fence_${fenceType}.png`;
    
    case Game.BILLY_FRONTIER:
      // Billy Frontier uses global002.png to global007.png
      return `assets/billyFrontier/fences/global${String(fenceType + 2).padStart(3, "0")}.png`;
    
    case Game.CRO_MAG:
      // CroMag has specific file names for each fence type
      const croMagFiles = [
        "desertskin.png", "invisible.png", "china1.png", "china2.png", "china3.png", "china4.png",
        "hieroglyphs.png", "camel.png", "farm.png", "aztec.png", "rockwall.png", "tallrockwall.png",
        "rockpile.png", "tribal.png", "horns.png", "crete.png", "rockpile2.png", "orangerock.png",
        "seaweed1.png", "seaweed2.png", "seaweed3.png", "seaweed4.png", "seaweed5.png", "seaweed6.png",
        "chinaconcrete.png", "chinadesign.png", "viking.png"
      ];
      return fenceType < croMagFiles.length 
        ? `assets/croMag/fences/${croMagFiles[fenceType]}`
        : `assets/croMag/fences/desertskin.png`; // fallback
    
    case Game.NANOSAUR_2:
      // Nanosaur 2 has limited fence assets
      const nanosaur2Files = ["pinefence.jpg", "dustdevil.jpg", "blockenemy.png"];
      return fenceType < nanosaur2Files.length
        ? `assets/nanosaur2/fences/${nanosaur2Files[fenceType]}`
        : `assets/nanosaur2/fences/pinefence.jpg`; // fallback
    
    case Game.NANOSAUR:
      // Nanosaur typically doesn't have fences
      return "";
    
    default:
      return "";
  }
}