import bcrypt from "bcryptjs"
import { fromText } from '@lucid-evolution/lucid'
import getCircuit from "./circuits/poseidon_hash_credential"

// kdf bcrypt password//
export async function hashPassword(pwd: string, salt?: string, rounds = 10): Promise<string> {
    const s = salt || await bcrypt.genSalt(rounds)
    const hash = await bcrypt.hash(pwd, s)

    console.log('salt:', s)
    console.log('salt rounds:', rounds)
    console.log('bcrypt hash:', hash)
    console.log('bcrypt hash (hex):', fromText(hash))

    return fromText(hash)

}

export async function hashCredentials(username: string, password: string,): Promise<string> {
    const pwd = fromText(password)
    const userId = fromText(username)
    const numPwd = BigInt(`0x${pwd}`).toString() // decimal number
    const numUserId = BigInt(`0x${userId}`).toString() // decimal number
    const inputs: string[] = [numPwd, numUserId]

    const circuit = await getCircuit()
    const w = await circuit.calculateWitness({ inputs })
    const hash = w[circuit.symbols["main.out"].varIdx].toString()

    console.log("credential hash (number):", hash)
    console.log("credential hash:", numberToHex(hash))
    return numberToHex(hash)
}

const numberToHex = (num: string | bigint): string => {
    const str = BigInt(num).toString(16)
    return str.padStart(str.length + (str.length % 2), '0')
}
