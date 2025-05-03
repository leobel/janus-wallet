import 'dotenv/config';
import { Blockfrost, Lucid, Network } from '@lucid-evolution/lucid';

export const getLucid = (async () => {
    const lucid = await Lucid(
        new Blockfrost(
            process.env.BLOCKFROST_API_URL!,
            process.env.BLOCKFROST_API_KEY!
        ),
        (process.env.CARDANO_NETWORK)! as Network
    );
    return lucid;
})();

export const numberToHex = (num: string | bigint): string => {
    const str = BigInt(num).toString(16)
    return str.padStart(str.length + (str.length % 2), '0')
}