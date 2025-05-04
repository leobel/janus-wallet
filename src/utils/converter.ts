// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

export const numberToHex = (num: string | bigint): string => {
    const str = BigInt(num).toString(16)
    return str.padStart(str.length + (str.length % 2), '0')
}

export const fromText = (text: string): string => {
    return toHex(new TextEncoder().encode(text));
}

export const toHex = (bytes: Uint8Array): string => {
    // pre-caching improves the speed 6x
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += hexes[bytes[i]];
    }
    return hex;
}