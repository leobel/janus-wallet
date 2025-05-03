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
const credentialHash = getArg('-h');
const userId = getArg('-u');
const challenge = getArg('-c');
const overflow = getArg('-f');

if (!password || !credentialHash || !userId || !challenge || !overflow) {
  console.error('Usage: pwd_hash_circuit.ts -p "pwd" -u "userId" -h "credentialHash" -c "challenge" -f "overflow"');
  process.exit(1);
}

const circuitHash = await circuitHashWithCircom("poseidon_hash_circuit.circom", [password, userId, credentialHash, challenge, overflow])
const circuitHash1 = await circuitHashTest("poseidon_hash_circuit.circom", [password, userId, credentialHash, challenge, overflow])
console.log("circuit hash:", circuitHash)
console.log("circuit hash:", circuitHash1)
process.exit(0)