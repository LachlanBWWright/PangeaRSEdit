export interface PackageAcceptanceTarget {
  name: string;
  launch: string;
  model: string;
  skeleton?: string;
  format: "bg3d" | "3dmf" | "shapes";
  start?: string;
}

export const packageAcceptanceTargets: readonly PackageAcceptanceTarget[] = [
  { name: "Otto Matic", launch: "ottomatic/OttoMatic.html?level=0", model: "games/ottomatic/skeletons/Blob.bg3d", skeleton: "games/ottomatic/skeletons/Blob.skeleton.rsrc", format: "bg3d" },
  { name: "Bugdom", launch: "bugdom/game.html?level=0&embed=1", model: "games/bugdom1/skeletons/FireFly.3dmf", skeleton: "games/bugdom1/skeletons/FireFly.skeleton.rsrc", format: "3dmf" },
  { name: "Bugdom 2", launch: "bugdom2/Bugdom2.html?level=0", model: "games/bugdom2/skeletons/Mouse.bg3d", skeleton: "games/bugdom2/skeletons/Mouse.skeleton.rsrc", format: "bg3d", start: "#loading-card" },
  { name: "Cro-Mag Rally", launch: "cromagrally/CroMagRally.html?track=1&car=1&mode=practice", model: "games/cromagrally/skeletons/GragStanding.bg3d", skeleton: "games/cromagrally/skeletons/GragStanding.skeleton.rsrc", format: "bg3d" },
  { name: "Billy Frontier", launch: "billyfrontier/billyfrontier.html?level=0", model: "games/billyfrontier/skeletons/Billy.bg3d", skeleton: "games/billyfrontier/skeletons/Billy.skeleton.rsrc", format: "bg3d" },
  { name: "Nanosaur", launch: "nanosaur/index.html?level=0&extreme=0", model: "games/nanosaur1/skeletons/Rex.3dmf", skeleton: "games/nanosaur1/skeletons/Rex.skeleton.rsrc", format: "3dmf" },
  { name: "Nanosaur 2", launch: "nanosaur2/Nanosaur2.html?level=0&deferStart=1", model: "games/nanosaur2/skeletons/nano.bg3d", skeleton: "games/nanosaur2/skeletons/nano.skeleton.rsrc", format: "bg3d", start: "#play-btn" },
  { name: "Mighty Mike", launch: "mightymike/index.html?level=0:0&deferStart=1", model: "data/mightymike/shapes/main.shapes", format: "shapes", start: "#play-btn" },
];
