import { hashWithCircomlib } from '.';

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
}

const password = getArg('-p');
const userId = getArg('-u');
const challenge = getArg('-c');
const overflow = getArg('-f');

if (!password || !userId || !challenge || !overflow) {
  console.error('Usage: hash_pwd.ts -p "pwd" -u "userId" -c "challenge" -f "overflow"');
  process.exit(1);
}

const hash = await hashWithCircomlib(password, userId, challenge, overflow)
console.log("pwd hash:", hash)
process.exit(0)