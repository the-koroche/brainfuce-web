export class StateMachine {

    constructor(code = "") {
        this.tape = new Array(32768).fill(0); // Memory cells
        this.ptr = 0;                        // Data pointer
        this.ip = 0;                         // Instruction pointer
        this.code = "";
        this.rawCode = "";
        this.ipMapping = [];                 // Mapping of instruction pointer to code character
        this.brackets = new Map();
        this.running = false;

        this.load(code);
    }

    // Loads a new code and resets the state
    load(code) {
        this.rawCode = code;
        this.ipMapping = []; // reset ip mapping

        let cleanedCodeArray = [];
        let inComment = false;

        for (let i = 0; i < code.length; i++) {
            const char = code[i];

            // Comment logic (from ';' to the end of the line)
            if (char === ';') {
                inComment = true;
                continue;
            }
            if (inComment && (char === '\n' || char === '\r')) {
                inComment = false;
            }

            // If we're not in a comment and this is a valid Brainfuck command
            if (!inComment && /[+\-<>.,[\]]/.test(char)) {
                cleanedCodeArray.push(char);
                // Remember that the current clean command was at index 'i' in the original
                this.ipMapping.push(i);
            }
        }

        this.code = cleanedCodeArray.join('');
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

    // Gets a character or number from the user
    getCharacterInput() {
        const input = prompt(
            "Enter a character (add . enter a number like .123)"
        );

        if (input === null || input.length === 0) {
            return 0;
        }

        if (input.startsWith(".") && input.length > 1) {
            const value = Number(input.slice(1));

            if (!Number.isInteger(value) || value < 0 || value > 255) {
                alert("Invalid input. Please enter a number between 0 and 255.");
                return 0;
            }

            return value;
        }

        return input.charCodeAt(0);
    }

    // One step of execution
    // Returns { status: true/false, output: "character or null" }
    step() {
        if (this.ip < 0 || this.ip >= this.code.length) return { status: false, output: null };

        const cmd = this.code[this.ip];
        let outputChar = null;

        switch (cmd) {
            case ">":
                this.ptr = (this.ptr + 1) & (this.tape.length - 1);
                break;
            case "<":
                this.ptr = (this.ptr - 1) & (this.tape.length - 1);
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
                this.tape[this.ptr] = this.getCharacterInput() & 255;
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

    getInstructionChar() {
        if (this.ip < 0 || this.ip >= this.code.length) {
            return { index: -1, char: null };
        }

        const rawIndex = this.ipMapping[this.ip];

        if (rawIndex === undefined) {
            return { index: -1, char: null };
        }

        return {
            index: rawIndex,
            char: this.rawCode[rawIndex]
        };
    }

    // Getters
    getTape() { return [...this.tape]; }
    getPointer() { return this.ptr; }
    getInstructionPointer() { return this.ip; }
    getCurrentCellValue() { return this.tape[this.ptr]; }
    getCode() { return this.code; }
    getRawCode() { return this.rawCode; }
}