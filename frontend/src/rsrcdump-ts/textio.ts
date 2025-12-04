// Utilities for text processing and type name parsing

import { Result, ok, err } from '../types/result';

export function sanitizeTypeName(restype: Uint8Array): Result<string, Error> {
  if (restype.length !== 4) {
    return err(new Error(`restype isn't 4 bytes`));
  }
  
  // Convert bytes to string, treating as raw bytes
  let result = '';
  for (let i = 0; i < restype.length; i++) {
    const byte = restype[i];
    if (byte !== undefined && byte >= 32 && byte <= 126) { // printable ASCII
      result += String.fromCharCode(byte);
    } else if (byte !== undefined) {
      result += encodeURIComponent(String.fromCharCode(byte));
    }
  }
  
  // Remove trailing spaces but keep them if they're all spaces
  if (!isAllSpaces(restype)) {
    result = result.replace(/%20+$/, '');
  }
  
  return ok(result);
}

export function parseTypeName(saneName: string): Result<Uint8Array, Error> {
  const decoded = new TextEncoder().encode(decodeURIComponent(saneName));
  const result = new Uint8Array(4);
  result.fill(0x20); // space character
  
  for (let i = 0; i < Math.min(decoded.length, 4); i++) {
    const byte = decoded[i];
    if (byte !== undefined) {
      result[i] = byte;
    }
  }
  
  if (decoded.length > 4) {
    return err(new Error(`decoded restype doesn't work out to 4 bytes`));
  }
  
  return ok(result);
}

function isAllSpaces(data: Uint8Array): boolean {
  return data.every(byte => byte === 0x20);
}

export function sanitizeResourceName(name: string | Uint8Array): string {
  const str = typeof name === 'string' ? name : new TextDecoder('utf-8').decode(name);
  let sanitized = '';
  
  for (const c of str) {
    if (/[A-Za-z0-9_-]/.test(c)) {
      sanitized += c;
    }
  }
  
  return sanitized;
}