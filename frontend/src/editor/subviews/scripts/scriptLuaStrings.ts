export interface LuaStringToken {
  readonly end: number;
  readonly value: string | null;
}

const escapes: Readonly<Record<string, string>> = {
  a: "\x07", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v",
  "\\": "\\", '"': '"', "'": "'",
};

export function readLuaLongString(source: string, start: number): LuaStringToken | null {
  if (source[start] !== "[") return null;
  let openingEnd = start + 1;
  while (source[openingEnd] === "=") openingEnd++;
  if (source[openingEnd] !== "[") return null;
  const contentStart = openingEnd + 1;
  const closing = `]${source.slice(start + 1, openingEnd)}]`;
  const end = source.indexOf(closing, contentStart);
  if (end < 0) return { end: source.length, value: null };
  return { end: end + closing.length, value: source.slice(contentStart, end).replace(/^(?:\r\n|\n\r|\r|\n)/, "").replace(/\r\n|\n\r|\r/g, "\n") };
}

export function readLuaQuotedString(source: string, start: number): LuaStringToken {
  const quote = source[start];
  let index = start + 1;
  let value = "";
  let valid = true;
  while (index < source.length) {
    const character = source[index++];
    if (character === quote) return { end: index, value: valid ? value : null };
    if (character !== "\\") {
      if (character === "\n" || character === "\r") valid = false;
      value += character;
      continue;
    }
    const escape = source[index++];
    if (escape === undefined) break;
    const simple = escapes[escape];
    if (simple !== undefined) { value += simple; continue; }
    if (escape === "z") {
      while (index < source.length && /\s/.test(source[index] ?? "")) index++;
      continue;
    }
    if (escape === "\n" || escape === "\r") {
      if (source[index] !== escape && (source[index] === "\r" || source[index] === "\n")) index++;
      value += "\n";
      continue;
    }
    const digits = escape === "x" ? /^[0-9a-fA-F]{2}/.exec(source.slice(index))
      : /^[0-9]{1,3}/.exec(source.slice(index - 1));
    if (digits) {
      const number = Number.parseInt(digits[0], escape === "x" ? 16 : 10);
      valid = valid && number <= 255;
      value += String.fromCharCode(number);
      index += digits[0].length - (escape === "x" ? 0 : 1);
      continue;
    }
    const unicode = escape === "u" ? /^\{([0-9a-fA-F]+)\}/.exec(source.slice(index)) : null;
    if (unicode) {
      const number = Number.parseInt(unicode[1] ?? "", 16);
      if (number <= 0x10ffff) value += String.fromCodePoint(number);
      else valid = false;
      index += unicode[0].length;
      continue;
    }
    valid = false;
  }
  return { end: source.length, value: null };
}
