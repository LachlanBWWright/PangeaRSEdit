import { Result, err, ok } from "neverthrow";

export const PNET_MAGIC = 0x54454e50;
export const PNET_PLAYER_NA = 0xffff;

export const PNET_PACKET_TYPE_MATCH_CONFIG = 1;
export const PNET_PACKET_TYPE_CLIENT_INPUT = 2;
export const PNET_PACKET_TYPE_HOST_SNAPSHOT = 3;
export const PNET_PACKET_TYPE_RELIABLE_EVENT = 4;
export const PNET_PACKET_TYPE_CLIENT_ACK = 5;
export const PNET_PACKET_TYPE_PAUSE = 6;
export const PNET_PACKET_TYPE_RESUME = 7;
export const PNET_PACKET_TYPE_DISCONNECT = 8;
export const PNET_PACKET_TYPE_PROTOCOL_ERROR = 9;
export const PNET_PACKET_TYPE_VEHICLE_TYPE = 10;
export const PNET_PACKET_TYPE_KEYFRAME_RESEND_REQUEST = 11;

const PNET_HEADER_SIZE_V1 = 24;
const PNET_HEADER_SIZE_V2 = 28;

export interface PnetHeader {
  readonly magic: number;
  readonly version: number;
  readonly packetType: number;
  readonly matchIdLow: number;
  readonly matchIdHigh: number;
  readonly tick: number;
  readonly sequence: number;
  readonly playerIndex: number;
  readonly reserved: number;
}

export function isPnetClientPacketType(packetType: number): boolean {
  return (
    packetType === PNET_PACKET_TYPE_CLIENT_INPUT ||
    packetType === PNET_PACKET_TYPE_CLIENT_ACK ||
    packetType === PNET_PACKET_TYPE_VEHICLE_TYPE ||
    packetType === PNET_PACKET_TYPE_KEYFRAME_RESEND_REQUEST
  );
}

export function isPnetHostPacketType(packetType: number): boolean {
  return (
    packetType === PNET_PACKET_TYPE_MATCH_CONFIG ||
    packetType === PNET_PACKET_TYPE_HOST_SNAPSHOT ||
    packetType === PNET_PACKET_TYPE_RELIABLE_EVENT ||
    packetType === PNET_PACKET_TYPE_PAUSE ||
    packetType === PNET_PACKET_TYPE_RESUME ||
    packetType === PNET_PACKET_TYPE_DISCONNECT ||
    packetType === PNET_PACKET_TYPE_PROTOCOL_ERROR
  );
}

export function isKnownPnetPacketType(packetType: number): boolean {
  return isPnetClientPacketType(packetType) || isPnetHostPacketType(packetType);
}

function readV1Header(view: DataView): PnetHeader {
  return {
    magic: view.getUint32(0, true),
    version: view.getUint16(4, true),
    packetType: view.getUint16(6, true),
    matchIdLow: view.getUint32(8, true),
    matchIdHigh: 0,
    tick: view.getUint32(12, true),
    sequence: view.getUint32(16, true),
    playerIndex: view.getUint16(20, true),
    reserved: view.getUint16(22, true),
  };
}

function readV2Header(view: DataView): PnetHeader {
  return {
    magic: view.getUint32(0, true),
    version: view.getUint16(4, true),
    packetType: view.getUint16(6, true),
    matchIdLow: view.getUint32(8, true),
    matchIdHigh: view.getUint32(12, true),
    tick: view.getUint32(16, true),
    sequence: view.getUint32(20, true),
    playerIndex: view.getUint16(24, true),
    reserved: view.getUint16(26, true),
  };
}

export function decodePnetHeader(bytes: ArrayBuffer): Result<PnetHeader, string> {
  if (bytes.byteLength < PNET_HEADER_SIZE_V1) {
    return err("PNET packet too small");
  }

  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== PNET_MAGIC) {
    return err("Not a PNET packet");
  }

  const version = view.getUint16(4, true);
  if (version === 1) {
    return ok(readV1Header(view));
  }
  if (version === 2) {
    if (bytes.byteLength < PNET_HEADER_SIZE_V2) {
      return err("PNET v2 packet too small");
    }
    return ok(readV2Header(view));
  }
  return err(`Unsupported PNET version ${String(version)}`);
}

export function deriveMatchIdPair(matchId: string): {
  readonly low: number;
  readonly high: number;
} {
  const compact = matchId.replaceAll("-", "");
  const low = Number.parseInt(compact.slice(24, 32), 16);
  const high = Number.parseInt(compact.slice(16, 24), 16);
  return {
    low: Number.isNaN(low) ? 0 : low,
    high: Number.isNaN(high) ? 0 : high,
  };
}

export function deriveRuntimeMatchIdPair(
  matchId: string,
  seed: number,
): {
  readonly low: number;
  readonly high: number;
} {
  const pair = deriveMatchIdPair(matchId);
  return {
    low: pair.low === 0 ? seed : pair.low,
    high: pair.high,
  };
}
