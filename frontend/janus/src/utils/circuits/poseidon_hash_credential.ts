import init from './poseidon_hash_credential.wasm?init'
import symbolsContent from './poseidon_hash_credential.sym?raw'
import * as utils from "./utils"
import { WitnessCalculator } from './witness_calculator'
import type { WitnessExports } from './witnessExports'
import { CircomCircuit } from './circom_circuit'


export default async function getCircuit(sanityCheck?: any): Promise<CircomCircuit> {
    let errStr = ""
    let msgStr = ""
    const imports = {
        runtime: {
            exceptionHandler: function (code: number) {
                let err;
                if (code === 1) {
                    err = "Signal not found.\n";
                } else if (code === 2) {
                    err = "Too many signals set.\n";
                } else if (code === 3) {
                    err = "Signal already set.\n";
                } else if (code === 4) {
                    err = "Assert Failed.\n";
                } else if (code === 5) {
                    err = "Not enough memory.\n";
                } else if (code === 6) {
                    err = "Input signal array access exceeds the size.\n";
                } else {
                    err = "Unknown error.\n";
                }
                throw new Error(err + errStr);
            },
            printErrorMessage: function () {
                errStr += getMessage() + "\n";
                // console.error(getMessage());
            },
            writeBufferMessage: function () {
                const msg = getMessage();
                // Any calls to `log()` will always end with a `\n`, so that's when we print and reset
                if (msg === "\n") {
                    console.log(msgStr);
                    msgStr = "";
                } else {
                    // If we've buffered other content, put a space in between the items
                    if (msgStr !== "") {
                        msgStr += " "
                    }
                    // Then append the message to the message we are creating
                    msgStr += msg;
                }
            },
            showSharedRWMemory: function () {
                printSharedRWMemory();
            }
        }
    }

    const instance = await init(imports)
    const exports = instance.exports as unknown as WitnessExports

    // this functions are needed for imports on WebAssembly.instantiate(wasmModule, imports)
    function getMessage() {
        let message = "";
        let c = exports.getMessageChar();
        while (c != 0) {
            message += String.fromCharCode(c);
            c = exports.getMessageChar();
        }
        return message;
    }

    function printSharedRWMemory() {
        const shared_rw_memory_size = exports.getFieldNumLen32();
        const arr = new Uint32Array(shared_rw_memory_size);
        for (let j = 0; j < shared_rw_memory_size; j++) {
            arr[shared_rw_memory_size - 1 - j] = exports.readSharedRWMemory(j);
        }

        // If we've buffered other content, put a space in between the items
        if (msgStr !== "") {
            msgStr += " "
        }
        // Then append the value to the message we are creating
        msgStr += (utils.fromArray32(arr).toString());
    }

    const symbols = utils.loadSymbols(symbolsContent)
    const calculator = new WitnessCalculator(exports, sanityCheck)
    return new CircomCircuit(calculator, symbols)
}
