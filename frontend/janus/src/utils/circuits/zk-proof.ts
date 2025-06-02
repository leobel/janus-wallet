import vkeys from './verification_key.json?raw'
import * as snarkjs from 'snarkjs'
import { buildBls12381, Scalar } from "ffjavascript"

export async function generate(input: snarkjs.CircuitSignals) {
    const { proof } = await generateProof(input);

    return compress([proof.pi_a, proof.pi_b, proof.pi_c])
        .then(points => {
            const [pA, pB, pC] = points;
            console.log("Proof (compressed):", [pA, pB, pC]);
            return { proof: [pA, pB, pC] }
        })
}

const vk = JSON.parse(vkeys)

async function generateProof(input: snarkjs.CircuitSignals) {
    try {
        // const wasmBuffer = fs.readFileSync(path.join(__dirname, baseDir, 'circuit_js/circuit.wasm'))
        // const zkeyBuffer = fs.readFileSync(path.join(__dirname, baseDir, 'circuit_final.zkey'))
        // const vk = JSON.parse(fs.readFileSync(path.join(__dirname, baseDir, 'verification_key.json'), 'utf-8'))
        // await snarkjs.wtns.calculate(input, wasmBuffer, wtnsFileName)

        // Generate proof and public signals in memory
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, "/circuit.wasm", "/circuit_final.zkey")
        // const { proof, publicSignals } = await snarkjs.groth16.prove(zKeyFileName, wtnsFileName)

        // console.log("Proof:", proof)
        // console.log("Public Signals:", publicSignals)
        // const isValid = await snarkjs.groth16.verify(vk, publicSignals, proof)
    
        const isValid = await snarkjs.groth16.verify(vk, publicSignals, proof)
        console.log('Is Valid?:', isValid)

        // console.log("Public Signals:", publicSignals);

        return { proof, publicSignals, vk }
    } catch (err) {
        console.error("Error generating proof:", err)
        throw err
    }
}

function signG1Point(y: any, half: bigint, p: bigint) {
    return Scalar.mod(y, p) > half ? 1 : 0; 
}

function signG2Point(y: any[], half: bigint, p: bigint) {
    const [y_0, y_1] = y;
    if (y_1 == 0) {
        return signG1Point(y_0, half, p);
    } else {
        return signG1Point(y_1, half, p);
    }
}

function minG1YCoordinates(y1: any[], half: bigint, p: bigint) {
    return signG1Point(y1, half, p) == 0;
}

function minG2YCoordinates(y1: any[], half: bigint, p: bigint) {
    return signG2Point(y1, half, p) == 0;
}

function getG1YCoordinates(x: any, bls12381: any) {
    const _x = bls12381.G1.F.fromObject(x);
    // console.log('b:', bls12381.G1.F.toObject(bls12381.G1.b));

    const x3b = bls12381.G1.F.add(bls12381.G1.F.mul(bls12381.G1.F.square(_x), _x), bls12381.G1.b); // x^3 + b
    const _y1 = bls12381.G1.F.sqrt(x3b);
    const _y2 = bls12381.G1.F.neg(_y1);
    const y1 = bls12381.G1.F.toObject(_y1);
    const y2 = bls12381.G1.F.toObject(_y2);
    const sorted = minG1YCoordinates(y1, bls12381.G1.F.half, bls12381.G1.F.p) ? [y1, y2] : [y2, y1];
    // console.log('Point X:', x);
    // console.log('Sorted y-coordinates:', sorted);
    return sorted;
}


function getG2YCoordinates(x: any, bls12381: any) {
    const _x = bls12381.G2.F.fromObject(x);
    const x3b = bls12381.G2.F.add(bls12381.G2.F.mul(bls12381.G2.F.square(_x), _x), bls12381.G2.b); // x^3 + b
    const _y1 = bls12381.G2.F.sqrt(x3b);
    const _y2 = bls12381.G2.F.neg(_y1);
    const y1 = bls12381.G2.F.toObject(_y1);
    const y2 = bls12381.G2.F.toObject(_y2);
    const sorted = minG2YCoordinates(y1, bls12381.G1.F.half, bls12381.G1.F.p) ? [y1, y2] : [y2, y1];
    // console.log('Point X:', x);
    // console.log('Sorted y-coordinates:', sorted);
    return sorted;
}

function compressG1(p: any[], bls12381: any) {

    const fP = p.map(n => BigInt(n));
    // get point bytes
    const point = bls12381.G1.fromObject(fP);
    //  console.log('Point bytes:', point);

    // compress point
    const buff = new Uint8Array(48);
    bls12381.G1.toRprCompressed(buff, 0, point);
    //  console.log('Compressed point bytes:', buff);
    //  console.log('Compressed point bits:', uint8ArrayToBits(buff));

    // check largest Y
    const [y1, y2] = getG1YCoordinates(fP[0], bls12381);
    const y = fP[1];
    if (y == y1) {
        // y-coordinate is the smallest so no third bit active
        buff[0] = buff[0] | 0x80;
    } else if (y == y2) {
        // y-coordinate is the largest so set third bit active
        buff[0] = buff[0] | 0xA0;
    } else {
        throw new Error(`Invalid y-coordinates: ${[y1, y2]} for point ${fP[0]}. Received y-coordinate was: ${fP[1]}`);
    }
    //  console.log('Compressed point bytes (final):', buff);
    //  console.log('Compressed point bits: (final)', uint8ArrayToBits(buff));

    // compressed point to hex
    const str = Buffer.from(buff).toString("hex");
    //  console.log('Compressed point hex:', str);

    return str;
}

function compressG2(p: any[], bls12381: any) {

    const fP = p.map(([n1, n2]) => [BigInt(n1), BigInt(n2)]);

    const point = bls12381.G2.fromObject(fP);

    // compress point
    const buff = new Uint8Array(96);
    bls12381.G2.toRprCompressed(buff, 0, point);
    //  console.log('Compressed point bytes:', buff);
    //  console.log('Compressed point bits:', uint8ArrayToBits(buff));

    // check largest Y
    const [y1, y2] = getG2YCoordinates(fP[0], bls12381);

    const [fPy1, fPy2] = fP[1];
    if (fPy1 == y1[0] && fPy2 == y1[1]) {
        // y-coordinates are the smallest so no third bit active
        buff[0] = buff[0] | 0x80;
    } else if (fPy1 == y2[0] && fPy2 == y2[1]) {
        // y-coordinates are the largest so set third bit active
        buff[0] = buff[0] | 0xA0;
    } else {
        throw new Error(`Invalid y-coordinates: ${[y1, y2]} for point ${fP[0]}. Received y-coordinate was: ${fP[1]}`);
    }
    //  console.log('Compressed point bytes (final):', buff);
    //  console.log('Compressed point bits: (final)', uint8ArrayToBits(buff));

    // compressed point to hex
    const str = Buffer.from(buff).toString("hex");
    //  console.log('Compressed point hex:', str);

    return str;

}

export async function compress(points: any[]) {
    // Load the BLS12-381 curve
    const bls12381 = await buildBls12381();
    return points.map(p => Array.isArray(p[0]) ? compressG2(p, bls12381) : compressG1(p, bls12381))
}