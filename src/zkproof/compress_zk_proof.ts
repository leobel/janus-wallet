import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compress } from '.';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv.length < 3) {
    throw new Error("Invalid arguments length, missing proof.json path")
}
const vkeyFile = path.join(__dirname, process.argv[2])
const outputFile = path.join(__dirname, process.argv[3] ||'compressed_proof.json')
console.log('VKFile:', vkeyFile)
console.log('OutputFile:', outputFile)

const proof = JSON.parse(fs.readFileSync(vkeyFile, 'utf-8'));
const [pa, pb,pc] = await compress([
    proof.pi_a, proof.pi_b, proof.pi_c
])

const proof_string = JSON.stringify({
    ...proof, pi_a: pa, pi_b: pb, pi_c: pc
}, null, 2)

fs.writeFileSync(outputFile, proof_string)
process.exit(0)