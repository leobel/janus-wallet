import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compress } from '.';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv.length < 3) {
    throw new Error("Invalid arguments length, missing verification_key.json path")
}
const vkeyFile = path.join(__dirname, process.argv[2])
const outputFile = path.join(__dirname, process.argv[3] ||'compressed_verification_key.json')
console.log('VKFile:', vkeyFile)
console.log('OutputFile:', outputFile)

const { vk_alpha_1, vk_beta_2, vk_gamma_2, vk_delta_2, IC } = JSON.parse(fs.readFileSync(vkeyFile, 'utf-8'));
const [vk_alpha1, vk_beta2, vk_gamma2, vk_delta2, ...vk_ic] = await compress([
    vk_alpha_1, vk_beta_2, vk_gamma_2, vk_delta_2, ...IC
])

const verification_key_string = JSON.stringify({
    vk_alpha1,
    vk_beta2,
    vk_gamma2,
    vk_delta2,
    vk_ic
}, null, 2)

fs.writeFileSync(outputFile, verification_key_string)
process.exit(0)