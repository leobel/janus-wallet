import * as utils from "./utils"

export async function builder(code: any, options?: any): Promise<WitnessCalculator> {
    options = options || {};

    let wasmModule;
    try {
        wasmModule = await WebAssembly.compile(code);
    } catch (err) {
        console.log(err);
        console.log("\nTry to run circom --c in order to generate c++ code instead\n");
        throw err;
    }

    let wc;
    let errStr = "";
    let msgStr = "";

    const instance = await WebAssembly.instantiate(wasmModule, {
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
    });

    const exports = instance.exports as unknown as WitnessExports
    const sanityCheck =
        options
//        options &&
//        (
//            options.sanityCheck ||
//            options.logGetSignal ||
//            options.logSetSignal ||
//            options.logStartComponent ||
//            options.logFinishComponent
//        );

    wc = new WitnessCalculator(instance, sanityCheck);
    return wc;

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

};

interface WitnessExports {
    getMessageChar(): number
    getVersion(): string
    getFieldNumLen32(): number
    getRawPrime(): bigint
    readSharedRWMemory(i: number): number
    getWitnessSize(): number
    init(n: number): void
    getInputSignalSize(a: number, b: number): number
    writeSharedRWMemory(j: number, k: number): void
    setInputSignal(a: number, b: number, c: number): void
    getInputSize(): number
    getWitness(i: number): number
  }

export class WitnessCalculator {
    instance: WebAssembly.Instance
    exports: WitnessExports
    n32: number
    prime: bigint
    witnessSize: number
    sanityCheck: any

    constructor(instance: WebAssembly.Instance, sanityCheck: any) {
        this.instance = instance
        this.exports = instance.exports as unknown as WitnessExports

        this.n32 = this.exports.getFieldNumLen32();

        this.exports.getRawPrime();
        const arr = new Uint32Array(this.n32);
        for (let i = 0; i < this.n32; i++) {
            arr[this.n32 - 1 - i] = this.exports.readSharedRWMemory(i);
        }
        this.prime = utils.fromArray32(arr);

        this.witnessSize = this.exports.getWitnessSize();

        this.sanityCheck = sanityCheck;
    }

    circom_version() {
        return this.exports.getVersion();
    }

    async _doCalculateWitness(input: any, sanityCheck?: any) {
        //input is assumed to be a map from signals to arrays of bigints
        this.exports.init((this.sanityCheck || sanityCheck) ? 1 : 0);
        const keys = Object.keys(input);
        let input_counter = 0;
        keys.forEach((k) => {
            const h = utils.fnvHash(k);
            const hMSB = parseInt(h.slice(0, 8), 16);
            const hLSB = parseInt(h.slice(8, 16), 16);
            const fArr = utils.flatArray(input[k]);
            let signalSize = this.exports.getInputSignalSize(hMSB, hLSB);
            if (signalSize < 0) {
                throw new Error(`Signal ${k} not found\n`);
            }
            if (fArr.length < signalSize) {
                throw new Error(`Not enough values for input signal ${k}\n`);
            }
            if (fArr.length > signalSize) {
                throw new Error(`Too many values for input signal ${k}\n`);
            }
            for (let i = 0; i < fArr.length; i++) {
                const arrFr = utils.toArray32(utils.normalize(fArr[i], this.prime), this.n32)
                for (let j = 0; j < this.n32; j++) {
                    this.exports.writeSharedRWMemory(j, arrFr[this.n32 - 1 - j]);
                }
                try {
                    this.exports.setInputSignal(hMSB, hLSB, i);
                    input_counter++;
                } catch (err) {
                    console.log(`After adding signal ${i} of ${k}`)
                    throw err;
                }
            }

        });
        if (input_counter < this.exports.getInputSize()) {
            throw new Error(`Not all inputs have been set. Only ${input_counter} out of ${this.exports.getInputSize()}`);
        }
    }

    async calculateWitness(input: any, sanityCheck?: any) {

        const w = [];

        await this._doCalculateWitness(input, sanityCheck);

        for (let i = 0; i < this.witnessSize; i++) {
            this.exports.getWitness(i);
            const arr = new Uint32Array(this.n32);
            for (let j = 0; j < this.n32; j++) {
                arr[this.n32 - 1 - j] = this.exports.readSharedRWMemory(j);
            }
            w.push(utils.fromArray32(arr));
        }

        return w;
    }

}