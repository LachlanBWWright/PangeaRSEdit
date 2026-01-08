export interface RawNanosaurItem {
  x: number;
  y?: number;
  z?: number;
  type: number;
  parm?: [number, number, number, number];
  flags?: number;
  prevItemIdx?: number;
  nextItemIdx?: number;
}

export interface RawNanosaurAttribute {
  bits?: number;
  parm0?: number;
  parm1?: number;
  parm2?: number;
  undefined?: number;
}
