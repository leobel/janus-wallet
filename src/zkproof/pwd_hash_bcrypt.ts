import bcrypt from "bcrypt"
import { fromText, toHex, toText } from '@lucid-evolution/lucid'

const args = process.argv.slice(2)
console.log('Args:', args)

function getArg(flag: string): string | undefined {
  const index = args.indexOf(flag)
  if (index !== -1 && args[index + 1]) {
    return args[index + 1]
  }
  return undefined
}

const password = getArg('-p')
const saltRounds = Number(getArg('-r') || 10)
const s = getArg('-s')
console.log('salt:', s)

if (!password) {
  console.error('Usage: pwd_hash_bcrypt.ts -p "pwd" -r 10')
  process.exit(1)
}

const salt = s || bcrypt.genSaltSync(saltRounds)

const hash = await bcrypt.hash(password, salt)

console.log('salt:', salt)
console.log('bcrypt hash:', hash)
console.log('bcrypt hash (hex):', fromText(hash))
console.log('bcrypt hash:', toText(fromText(hash)))