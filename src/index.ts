import { Poseidon, Field, Circuit, circuitMain, public_ } from 'o1js';

/**
 * Public input: a hash value h
 *
 * Prove:
 *   I know a value x such that hash(x) = h
 */
class Main extends Circuit {
    @circuitMain
    static main(pwd: Field, @public_ hash: Field): void {
        Poseidon.hash([pwd]).assertEquals(hash);
    }
}

async function start() {
    console.log('Circuit Info...');
    console.log('Poseidon state:', Poseidon.initialState().map(f => f.toString()));


    console.log('generating keypair...');
    const kp = await Main.generateKeypair();

    // Ensure that Field is used as a constructor if necessary
    const pwd = Field("1234");
    const hash = Poseidon.hash([pwd]);
    console.log('Hash:', hash.toString());


    console.log('prove...');
    const pi = await Main.prove([pwd], [hash], kp);

    console.log('verify...');
    const ok = await Main.verify([hash], kp.verificationKey(), pi);
    console.log('ok?', ok);

    if (!ok) throw Error('verification failed');
}

start().then(() => console.log('done!'));
