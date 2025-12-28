/**
 * Standard KonvaView - For games using standard supertile format
 * (Bugdom 2, Nanosaur 2, Cro-Mag Rally, Billy Frontier)
 * 
 * Features:
 * - Uses pre-composed supertiles (8x8 tiles)
 * - Supports fences
 * - Supports liquid/water bodies
 * - Supports splines
 * - Same as OttoMaticKonvaView (alias for consistency)
 */

import { OttoMaticKonvaView } from "./OttoMaticKonvaView";

// StandardKonvaView is functionally identical to OttoMaticKonvaView
// We export it as an alias for clarity in the code
export { OttoMaticKonvaView as StandardKonvaView };
export type { StageData } from "./OttoMaticKonvaView";
