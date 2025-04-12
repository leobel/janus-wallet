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

