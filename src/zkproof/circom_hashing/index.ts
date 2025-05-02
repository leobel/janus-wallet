import fs from "fs"
import { setGracefulCleanup, dir } from "tmp-promise"
import path from "path"
import util from "util"
import { exec as _exec } from "child_process"
import {builder, WitnessCalculator} from "./witness_calculator"

const exec = util.promisify(_exec);

export async function wasm_tester(circomInput: any, _options: any) {

    const rightVersion = await compiler_above_version("2.0.0");
    if (!rightVersion) {
        throw new Error("Wrong compiler version. Must be at least 2.0.0")
    }

    const baseName = path.basename(circomInput, ".circom");
    const options = Object.assign({}, _options);

    options.wasm = true;

    options.sym = true;
    options.json = options.json || false; // costraints in json format
    options.r1cs = true;
    options.compile = (typeof options.recompile === 'undefined') ? true : options.recompile; // by default compile

    if (typeof options.output === 'undefined') {
        setGracefulCleanup();
        const _dir = await dir({prefix: "circom_", unsafeCleanup: true});
        //console.log(dir.path);
        options.output = _dir.path;
    } else {
        try {
            await fs.promises.access(options.output);
        } catch (err) {
            if(!options.compile) {
                throw new Error("Cannot set recompile to false if the output path does not exist")
            }
            await fs.promises.mkdir(options.output, {recursive: true});
        }
    }
    if (options.compile) {
        await compile(circomInput, options);
    } else {
        const jsPath = path.join(options.output, baseName + "_js");
        try {
            await fs.promises.access(jsPath);
        } catch (err) {
            // assert(false, "Cannot set recompile to false if the " + jsPath + " folder does not exist");
        }
    }

    const wasm = await fs.promises.readFile(path.join(options.output, baseName + "_js/" + baseName + ".wasm"));

    const wc = await builder(wasm);

    return new WasmTester(options.output, baseName, wc);
}

async function compile(fileName: string, options: any) {
    let flags = "--wasm ";
    if (options.include) {
        if (Array.isArray(options.include)) {
            for (let i = 0; i < options.include.length; i++) {
                flags += "-l " + options.include[i] + " ";
            }
        } else {
            flags += "-l " + options.include + " ";
        }
    }
    if (options.sym) flags += "--sym ";
    if (options.r1cs) flags += "--r1cs ";
    if (options.json) flags += "--json ";
    if (options.output) flags += "--output " + options.output + " ";
    if (options.prime) flags += "--prime " + options.prime + " ";
    if (options.O === 0) flags += "--O0 ";
    if (options.O === 1) flags += "--O1 ";
    if (options.verbose) flags += "--verbose ";
    if (options.inspect) flags += "--inspect ";

    try {
        let b = await exec("circom " + flags + fileName);
        if (options.verbose) {
            console.log(b.stdout);
        }
        if (b.stderr) {
            console.error(b.stderr);
        }
    } catch (e) {
        // assert(false, "circom compiler error \n" + e);
    }
}

class WasmTester {
    dir: any
    baseName: any
    witnessCalculator: WitnessCalculator;
    symbols: Record<string, any>
    constraints: any

    constructor(dir: any, baseName: any, witnessCalculator: WitnessCalculator) {
        this.dir = dir;
        this.baseName = baseName;
        this.witnessCalculator = witnessCalculator;
    }

    async release() {
        await this.dir.cleanup();
    }

    async calculateWitness(input: any, sanityCheck?: any) {
        return await this.witnessCalculator.calculateWitness(input, sanityCheck);
    }

    async loadSymbols() {
        if (this.symbols) return;
        this.symbols = {};
        const symsStr = await fs.promises.readFile(
            path.join(this.dir, this.baseName + ".sym"),
            "utf8"
        );
        const lines = symsStr.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const arr = lines[i].split(",");
            if (arr.length != 4) continue;
            this.symbols[arr[3]] = {
                labelIdx: Number(arr[0]),
                varIdx: Number(arr[1]),
                componentIdx: Number(arr[2]),
            };
        }
    }

    async getDecoratedOutput(witness: any) {
        const self = this;
        const lines = [];
        if (!self.symbols) await self.loadSymbols();
        for (let n in self.symbols) {
            let v;
            if (witness[self.symbols[n].varIdx] !== undefined) {
                v = witness[self.symbols[n].varIdx].toString();
            } else {
                v = "undefined";
            }
            lines.push(`${n} --> ${v}`);
        }
        return lines.join("\n");
    }

    async getOutput(witness: any, output: any, templateName = "main") {
        const self = this;
        if (!self.symbols) await self.loadSymbols();

        let prefix = "main";
        if (templateName != "main") {
            const regex = new RegExp(`^.*${templateName}[^.]*\.[^.]+$`);
            Object.keys(self.symbols).find((k) => {
                if (regex.test(k)) {
                    prefix = k.replace(/\.[^.]+$/, "");
                    return true;
                }
            });
        }

        return get_by_prefix(prefix, output);

        function get_by_prefix(prefix: string, out: any): any {
            if (typeof out == "object" && out.constructor.name == "Object") {
                return Object.fromEntries(
                    Object.entries(out).map(([k, v]) => [
                        k,
                        get_by_prefix(`${prefix}.${k}`, v),
                    ])
                );
            } else if (Array.isArray(out)) {
                if (out.length == 1) {
                    return get_by_prefix(prefix, out[0]);
                } else if (out.length == 0 || out.length > 2) {
                    // assert(false, `Invalid output format: ${prefix} ${out}`);
                }

                return Array.from({ length: out[0] }, (_, i) =>
                    get_by_prefix(`${prefix}[${i}]`, out[1])
                );
            } else {
                if (out == 1) {
                    const name = `${prefix}`;
                    if (typeof self.symbols[name] == "undefined") {
                        // assert(false, `Output variable not defined: ${name}`);
                    }
                    return witness[self.symbols[name].varIdx];
                } else {
                    return Array.from({ length: out }, (_, i) => {
                        const name = `${prefix}[${i}]`;
                        if (typeof self.symbols[name] == "undefined") {
                            // assert(false, `Output variable not defined: ${name}`);
                        }
                        return witness[self.symbols[name].varIdx];
                    });
                }
            }
        }
    }

}

function version_to_list(v: string) {
    return v.split(".").map(function (x) {
        return parseInt(x, 10);
    });
}

function check_versions(v1: number[], v2: number[]) {
    //check if v1 is newer than or equal to v2
    for (let i = 0; i < v2.length; i++) {
        if (v1[i] > v2[i]) return true;
        if (v1[i] < v2[i]) return false;
    }
    return true;
}

async function compiler_above_version(v: string) {
    let output = (await exec('circom --version')).stdout;
    let compiler_version = version_to_list(output.slice(output.search(/\d/), -1));
    let vlist = version_to_list(v);
    return check_versions(compiler_version, vlist);
}