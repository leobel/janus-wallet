import fnv from "fnv-plus"

export function toArray32(rem: bigint, size: number) {
    const res = []; //new Uint32Array(size); //has no unshift
    const radix = BigInt(0x100000000);
    while (rem) {
        res.unshift(Number(rem % radix));
        rem = rem / radix;
    }
    if (size) {
        var i = size - res.length;
        while (i > 0) {
            res.unshift(0);
            i--;
        }
    }
    return res;
}

export function fromArray32(arr: Uint32Array) { //returns a BigInt
    var res = BigInt(0);
    const radix = BigInt(0x100000000);
    for (let i = 0; i < arr.length; i++) {
        res = res * radix + BigInt(arr[i]);
    }
    return res;
}

export function flatArray(a: any[]) {
    var res: any[] = [];
    fillArray(res, a);
    return res;

    function fillArray(res: any[], a: any[]) {
        if (Array.isArray(a)) {
            for (let i = 0; i < a.length; i++) {
                fillArray(res, a[i]);
            }
        } else {
            res.push(a);
        }
    }
}

export function normalize(n: number, prime: bigint) {
    let res = BigInt(n) % prime
    if (res < 0) res += prime
    return res
}

export function fnvHash(str: string) {
    return fnv.hash(str, 64).hex()
}