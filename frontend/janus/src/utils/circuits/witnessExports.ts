export interface WitnessExports {
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