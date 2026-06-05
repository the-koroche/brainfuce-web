export class StateMachine {
    constructor(code = "") {
        this.tape = new Array(1024).fill(0); // 1024 memory cells
        this.ptr = 0;                       // Data pointer
        this.ip = 0;                        // Instruction pointer
        this.code = "";
        this.brackets = new Map();
        this.running = false;

        this.load(code);
    }

    // Loads a new code and resets the state
    load(code) {
        // 1. Strip out line comments starting with a semicolon (;)
        // This removes the semicolon and everything after it up to the end of that line
        const codeWithoutComments = code.replace(/;.*$/gm, '');

        // 2. Now clean up the remaining text, leaving ONLY true Brainfuck commands
        this.code = codeWithoutComments.replace(/[^+\-<>.,[\]]/g, '');

        this.ip = 0;
        this.ptr = 0;
        this.tape.fill(0);
        this.brackets = this.buildBrackets(this.code);
        this.running = false;
    }

    // Builds a map of matching brackets
    buildBrackets(code) {
        const map = new Map();
        const stack = [];

        for (let i = 0; i < code.length; i++) {
            if (code[i] === "[") stack.push(i);
            else if (code[i] === "]") {
                const open = stack.pop();
                if (open !== undefined) {
                    map.set(open, i);
                    map.set(i, open);
                }
            }
        }
        return map;
    }

    // One step of execution
    // Returns { status: true/false, output: "character or null" }
    step() {
        if (this.ip < 0 || this.ip >= this.code.length) return { status: false, output: null };

        const cmd = this.code[this.ip];
        let outputChar = null;

        switch (cmd) {
            case ">":
                this.ptr = (this.ptr + 1) & 255;
                break;
            case "<":
                this.ptr = (this.ptr - 1) & 255;
                break;
            case "+":
                this.tape[this.ptr] = (this.tape[this.ptr] + 1) & 255;
                break;
            case "-":
                this.tape[this.ptr] = (this.tape[this.ptr] - 1) & 255;
                break;
            case ".":
                outputChar = String.fromCharCode(this.tape[this.ptr]);
                break;
            case ",":
                this.tape[this.ptr] = (prompt("Enter a character")?.charCodeAt(0) ?? 0) & 255;
                break;
            case "[":
                if (this.tape[this.ptr] === 0) {
                    this.ip = this.brackets.get(this.ip);
                }
                break;
            case "]":
                if (this.tape[this.ptr] !== 0) {
                    this.ip = this.brackets.get(this.ip);
                }
                break;
        }

        this.ip++;
        return { status: true, output: outputChar };
    }

    // Getters
    getTape() { return [...this.tape]; }
    getPointer() { return this.ptr; }
    getInstructionPointer() { return this.ip; }
    getCurrentCellValue() { return this.tape[this.ptr]; }
    getCode() { return this.code; }
}