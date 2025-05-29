import type { WitnessCalculator } from "./witness_calculator";

export class CircomCircuit {
    witnessCalculator: WitnessCalculator
    symbols: Record<string, any>

    constructor(witnessCalculator: WitnessCalculator, symbols: Record<string, any>) {
        this.witnessCalculator = witnessCalculator
        this.symbols = symbols
    }

    async calculateWitness(input: any, sanityCheck?: any) {
        return await this.witnessCalculator.calculateWitness(input, sanityCheck);
    }

    async getDecoratedOutput(witness: any) {
        const self = this;
        const lines = [];
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