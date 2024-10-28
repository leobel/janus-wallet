import fs from 'fs';
import path from 'path';
import * as snarkjs from 'snarkjs';
import { buildBls12381, Scalar } from "ffjavascript";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function compress(points: any[]) {
    // Load the BLS12-381 curve
    const bls12381 = await buildBls12381();
    return points.map(p => Array.isArray(p[0]) ? compressG2(p, bls12381) : compressG1(p, bls12381))
}

async function generateProof(input: snarkjs.CircuitSignals, baseDir = 'bls12381') {
    try {
        // Read inputs directly from files
        const wtnsFileName = path.join(__dirname, baseDir, 'witness.wtns');
        const zKeyFileName = path.join(__dirname, baseDir, 'circuit_final.zkey');
        const wasmBuffer = fs.readFileSync(path.join(__dirname, baseDir, 'circuit_js/circuit.wasm'));
        const zkeyBuffer = fs.readFileSync(path.join(__dirname, baseDir, 'circuit_final.zkey'));
        const vk = JSON.parse(fs.readFileSync(path.join(__dirname, baseDir, 'verification_key.json'), 'utf-8'));

        // await snarkjs.wtns.calculate(input, wasmBuffer, wtnsFileName);

        // Generate proof and public signals in memory
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmBuffer, zkeyBuffer);
        // const { proof, publicSignals } = await snarkjs.groth16.prove(zKeyFileName, wtnsFileName);

        // console.log("Proof:", proof);
        // console.log("Public Signals:", publicSignals);
        // const isValid = await snarkjs.groth16.verify(vk, publicSignals, proof);
        const _proof = {
            pi_a: [
                '1330475380562299427428762448203687919919281580897958062487648922294976260214579359049599979512103209576004167536799',
                '2656388069901121394270740090575330030287904648797506227319546771379534312606378542638423152348120757491563705482659',
                '1'
            ],
            pi_b: [
                [
                    '1421711867345440374916106992337940439324740745814499575934728203939473496237916420945295836283035833304389942986703',
                    '933241408416643144187076444667563122327515323050680291443141217274931012742514391174751880907650576800627519159167'
                ],
                [
                    '1895579985964119089305666620321486362558911969242920376888849526141314425147843373452426168101695904569161395930597',
                    '3077111543747555736577523233654657683170065147626488192416848289750243686094752704029523483446639408253773040998675'
                    // '2106829569257548304112123205414417793997970850696087508443208609982717225342994490990261461027319759468732876629190',
                    // '925298011474111656840266592081246473386817672312519692915209846373787964396085160413164145682376255784121231561112'
                ],
                ['1', '0']
            ],
            pi_c: [
                '3537739318755074918518683049199396384023061471113438110419536326395635823389842227463110759612150723580351509151116',
                '3959729940282921652759274671479457847598107607493386460481840686116958470560075446185122526798002664671348393127532',
                '1'
            ],
            protocol: 'groth16',
            curve: 'bls12381'
        }
        // const isValid = await snarkjs.groth16.verify(vk, publicSignals, proof);
        // console.log('Is Valid?:', isValid);

        // console.log("Public Signals:", publicSignals);

        return { proof, publicSignals, vk };
    } catch (error) {
        console.error("Error generating proof:", error);
        throw error;
    }
}


export async function generate(input: snarkjs.CircuitSignals) {
    const { proof, } = await generateProof(input);

    return compress([proof.pi_a, proof.pi_b, proof.pi_c])
        .then(points => {
            const [pA, pB, pC] = points;
            console.log("Proof (compressed):", [pA, pB, pC]);
            return { proof: [pA, pB, pC] }
        })
}


// const input = {
//     // "userId": "332621201508635767746608",
//     // "challenge": "26273499253708602252771650615111054499828667033240299119550611141508012447328",
//     // "hash": "10343661163184219313272354919635983875711247223011266158462328948931637363678",
//     // "pwd": "1234"
//     "userId": 567n,
//     "challenge": 32061325926100244839728411285060075964907793563017957268288049843895531058762n,
//     "hash": 10343661163184219313272354919635983875711247223011266158462328948931637363678n,
//     "pwd": 1234n
// }

// generate(input).then(({proof, verification}) => {
//     console.log('[pA, pB, pC]:', proof);
//     console.log('[vk_alpha_1, vk_beta_2, vk_gamma_2, vk_delta_2, ...IC]:', verification);

// });