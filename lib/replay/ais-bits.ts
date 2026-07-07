// AIS bit-level primitives for the replay harness: a big-endian bit writer,
// the ITU sixbit text alphabet, and payload armoring (6 bits per ASCII char).
// Pure. The message encoders that use these live in ais.ts; correctness is
// proven by round-tripping through the real SK parser in ais.test.ts.

// Accumulates a bitstring MSB-first. Clarity over speed — a replay harness
// encodes a handful of sentences per second, not millions.
export class BitWriter {
  private bits = "";

  // Unsigned integer, `width` bits.
  u(value: number, width: number): this {
    if (value < 0 || value >= 2 ** width) throw new Error(`u${width} out of range: ${value}`);
    this.bits += value.toString(2).padStart(width, "0");
    return this;
  }

  // Signed integer, two's complement, `width` bits.
  i(value: number, width: number): this {
    const v = Math.round(value);
    if (v >= 2 ** (width - 1) || v < -(2 ** (width - 1))) throw new Error(`i${width} out of range: ${v}`);
    return this.u(v < 0 ? v + 2 ** width : v, width);
  }

  // Text in the AIS sixbit alphabet, padded/truncated to `chars` characters.
  text(s: string, chars: number): this {
    const up = s.toUpperCase().slice(0, chars).padEnd(chars, "@"); // @ = 0 = pad
    for (const ch of up) {
      const code = ch.charCodeAt(0);
      // '@'(64)..'_'(95) → 0..31; ' '(32)..'?'(63) → 32..63
      const v = code >= 64 && code < 96 ? code - 64 : code >= 32 && code < 64 ? code : 32;
      this.u(v, 6);
    }
    return this;
  }

  length(): number {
    return this.bits.length;
  }

  // Pad to a multiple of 6 and armor: each 6-bit group → one payload char.
  // Returns the payload string and the number of fill bits added.
  armor(): { payload: string; fill: number } {
    const fill = (6 - (this.bits.length % 6)) % 6;
    const padded = this.bits + "0".repeat(fill);
    let payload = "";
    for (let i = 0; i < padded.length; i += 6) {
      const v = parseInt(padded.slice(i, i + 6), 2);
      payload += String.fromCharCode(v < 40 ? v + 48 : v + 56);
    }
    return { payload, fill };
  }
}

// Scale helpers for AIS position/motion fields.
export const aisLon = (deg: number) => Math.round(deg * 600000); // 1/10000 min, i28
export const aisLat = (deg: number) => Math.round(deg * 600000); // 1/10000 min, i27
export const aisSog = (kt: number) => Math.min(1022, Math.round(kt * 10)); // 0.1 kt, u10
export const aisCog = (deg: number) => Math.round((((deg % 360) + 360) % 360) * 10); // 0.1°, u12
export const aisHdg = (deg: number) => Math.round(((deg % 360) + 360) % 360) % 360; // 1°, u9
