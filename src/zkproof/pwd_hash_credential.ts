import { fromText } from '@lucid-evolution/lucid';
import { circuitHashTest, circuitHashWithCircom } from '.';

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
console.log("credential hash:", credHash)
console.log("credential hash:", credHash1)
process.exit(0)