import { Reader } from "./IReader"
import { MachineDef } from "../common/MachineDef"
import { RecipeDatabase } from "../common/RecipeDatabase"

const REG_MACHINEDEF_START = /^\/\/ MACHINEDEF (.+)$/
const REG_MACHINEDEF_PRETTYNAME = /^PRETTYNAME (.+)$/
const REG_MACHINEDEF_WHITELIST = /^WHITELIST (.+)$/
const REG_MACHINEDEF_END = /^\/\/ ENDMACHINEDEF (.+)$/

interface TempMachineDef extends MachineDef {
	key: string;
}

/**
 * MachineDef reader.
 */
export class MachineDefReader implements Reader {
	match: RegExpMatchArray | null;
	recipeDatabase: RecipeDatabase;

	tempMachineDef: TempMachineDef | null;
	isFirstPostCall: boolean;

	constructor(recipeDatabase: RecipeDatabase) {
		this.recipeDatabase = recipeDatabase
	}

	/**
	 * Finalizes the MachineDef block.
	 */
	private finalize(): void {
		if (this.tempMachineDef) {
			const output: MachineDef = {}
			if (this.tempMachineDef.prettyName) {
				output.prettyName = this.tempMachineDef.prettyName
			}

			if (this.tempMachineDef.inputWhiteList) {
				output.inputWhiteList = this.tempMachineDef.inputWhiteList
			}

			this.recipeDatabase.machineDefs[this.tempMachineDef.key] = output
			this.tempMachineDef = null
		} else {
			throw new Error("Illegal finalize() call.")
		}
	}

	/**
	 * Returns true if the current line is the beginning of a MachineDef.
	 * 
	 * @param line Current line.
	 */
	pre(line: string): boolean {
		if (this.tempMachineDef || (this.match = REG_MACHINEDEF_START.exec(line))) {
			this.isFirstPostCall = true
			return true
		}

		return false
	}

	/**
	 * Reads the MachineDef metadata.
	 * 
	 * @param line Current line.
	 */
	post(line: string): boolean {
		const isFirst = this.isFirstPostCall
		this.isFirstPostCall = false

		// Match the beginning of a MachineDef
		if (this.match) {
			if (!isFirst) {
				throw new Error("Duplicate MachineDef definition.")
			}

			this.tempMachineDef = {
				key: this.match[1]
			}

			this.match = null
			return true // Continue Reading
		}

		if (this.tempMachineDef) {
			// Match PRETTYNAME
			this.match = REG_MACHINEDEF_PRETTYNAME.exec(line)
			if (this.match) {
				this.tempMachineDef.prettyName = this.match[1]

				this.match = null
				return true // Continue Reading
			}

			// Match WHITELIST
			this.match = REG_MACHINEDEF_WHITELIST.exec(line)
			if (this.match) {
				if (!this.tempMachineDef.inputWhiteList) {
					this.tempMachineDef.inputWhiteList = []
				}

				this.tempMachineDef.inputWhiteList.push(new RegExp(this.match[1]))

				this.match = null
				return true // Continue Reading
			}

			// Match the end of a block
			this.match = REG_MACHINEDEF_END.exec(line)
			if (this.match) {
				this.finalize()

				this.match = null
				return false // Stop Reading
			}
		} else {
			throw new Error("Not inside a MachineDef block.")
		}

		throw new Error(`Unexpected expression: ${line}`)
	}
}