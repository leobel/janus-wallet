import { circuitHashTest, circuitHashWithCircom } from '.';
import { fromText, numberToHex } from '../utils/converter';

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
}

const password = getArg('-p');
const user = getArg('-u');

if (!password || !user) {
  console.error('Usage: pwd_hash_credential.ts -p "pwd" -u "userId"');
  process.exit(1);
}

const pwd = fromText(password)
const userId = fromText(user)

const numPwd = BigInt(`0x${pwd}`).toString() // decimal number
const numUserId = BigInt(`0x${userId}`).toString() // decimal number

const credHash = await circuitHashWithCircom("poseidon_hash_credential.circom", [numPwd, numUserId])
const credHash1 = await circuitHashTest("poseidon_hash_credential.circom", [numPwd, numUserId])
console.log("credential hash (number):", credHash)
console.log("credential hash (number):",  credHash1)
console.log("credential hash:", numberToHex(credHash1))
console.log("credential hash:", numberToHex(credHash1))
process.exit(0)