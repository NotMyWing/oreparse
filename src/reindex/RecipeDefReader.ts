import { Reader } from "./IReader"
import { RecipeDatabase } from "../common/RecipeDatabase"
import { MachineDef } from "../common/MachineDef"
import { OreFilter } from "../config"
import { prettifyName } from "../common/Util"
import { RecipeEntryDef, ProductCollection, ProductDef } from "../common/RecipeDef"

const REG_RECIPEDEF_BEGIN = /\/\/ BEGIN (.+)/
const REG_RECIPEDEF_FINISH = /\/\/ FINISH (.+)/
const REG_RECIPEDEF_IN = /IN (.+)/
const REG_RECIPEDEF_OUT = /OUT (.+)/
const REG_RECIPEDEF_EUT = /EUT (\d+)/
const REG_RECIPEDEF_DIV = /---/

interface TempRecipeEntry {
	input?: string;
	outputs?: Set<string>;
	EUt?: number;
}

interface RecipeEntryTuple {
	key: string;
	recipeEntryDef: RecipeEntryDef;
}

export class RecipeDefReader implements Reader {
	match: RegExpMatchArray | null;
	recipeDatabase: RecipeDatabase;

	currentMachine: string | null;
	currentMachineDef: MachineDef | null;
	
	tempRecipeDef: TempRecipeEntry | null;

	blacklistMemo: {[key: string]: boolean} = {};

	constructor(recipeDatabase: RecipeDatabase) {
		this.recipeDatabase = recipeDatabase
	}

	/**
	 * Finalizes the recipe.
	 */
	private finalizeRecipe(input: string, outputs: string[], EUt?: number): void {
		if (!this.currentMachine || !this.currentMachineDef) {
			throw new Error("Invalid finalizeRecipe() call, not reading a RecipeDef.")
		}

		// Create database entries for outputs
		const definitions: (RecipeEntryTuple | undefined)[] = [input, ...outputs].map(item => {
			if (this.blacklistMemo[item]) {
				return undefined
			}

			const whitelist = item == input ? this.currentMachineDef?.inputWhiteList 
				: this.currentMachineDef?.outputWhiteList

			if (whitelist) {
				if (!whitelist.some(reg => reg.exec(item))) {
					console.log(`Skipping ${item} (machine whitelist miss)`)

					this.blacklistMemo[item] = true
					return undefined
				}
			}

			if (this.recipeDatabase.recipeDefs[item]) {
				return {
					key: item,
					recipeEntryDef: this.recipeDatabase.recipeDefs[item]
				} as RecipeEntryTuple
			}

			if (OreFilter.oreDictionaryBlackList.some(reg => reg.exec(item))) {
				console.log(`Skipping ${item} (blacklist hit)`)

				this.blacklistMemo[item] = true
				return undefined
			}

			OreFilter.oreDictionaryReplacements.forEach((rep, pattern) => {
				item = item.replace(pattern, rep)
			})

			return {
				key: item
				, recipeEntryDef: {
					prettyName: prettifyName(item) || item
				}
			} as RecipeEntryTuple
		})

		const inputDef = definitions[0]
		const outputDefs = definitions.slice(1).filter(x => x !== undefined) as RecipeEntryTuple[]

		if (inputDef && outputDefs.length !== 0) {
			[inputDef, ...outputDefs].forEach(tuple => {
				if (OreFilter.majorSources.some(reg => reg.exec(tuple.key))) {
					tuple.recipeEntryDef.major = true
				}

				if (!this.recipeDatabase.recipeDefs[tuple.key]) {
					this.recipeDatabase.recipeDefs[tuple.key] = tuple.recipeEntryDef
				}
			})

			let products: ProductCollection
			if (!inputDef.recipeEntryDef.products) {
				products = {}
				inputDef.recipeEntryDef.products = products
			} else {
				products = inputDef.recipeEntryDef.products
			}

			outputDefs.forEach(tuple => {
				products[tuple.key] = {
					machine: this.currentMachine as string
					, EUt: EUt
				} as ProductDef

				if (!tuple.recipeEntryDef.producedBy) {
					tuple.recipeEntryDef.producedBy = {}
				}

				tuple.recipeEntryDef.producedBy[inputDef.key] = {
					machine: this.currentMachine as string
					, EUt: EUt
				} as ProductDef
			})
		}
	}

	/**
	 * Returns true if the current line is the beginning of a MachineDef.
	 * 
	 * @param line Current line.
	 */
	pre(line: string): boolean {
		if (this.currentMachine || (this.match = REG_RECIPEDEF_BEGIN.exec(line))) {
			if (this.currentMachine && this.match) {
				throw new Error("Already reading a RecipeDef.")
			}

			return true
		}

		return false
	}

	/**
	 * Reads the Recipes metadata.
	 * 
	 * @param line Current line.
	 */
	post(line: string): boolean {
		// Match the beginning of a MachineDef
		if (this.match) {
			if (this.currentMachine) {
				throw new Error("Already reading a RecipeDef.")
			}

			this.currentMachine = this.match[1]
			this.currentMachineDef = this.recipeDatabase.machineDefs[this.currentMachine]

			if (!this.currentMachineDef) {
				throw new Error(`No MachineDef found for ${this.currentMachine}`)
			}

			console.debug(`RecipeReader: reading ${this.currentMachine}`)

			this.match = null
			return true // Continue Reading
		}

		if (this.currentMachine) {
			// Match EUT
			this.match = REG_RECIPEDEF_EUT.exec(line)
			if (this.match) {
				if (!this.tempRecipeDef) {
					this.tempRecipeDef = {}
				}

				this.tempRecipeDef.EUt = Number(this.match[1])

				this.match = null
				return true // Continue Reading
			}

			// Match IN
			this.match = REG_RECIPEDEF_IN.exec(line)
			if (this.match) {
				if (!this.tempRecipeDef) {
					this.tempRecipeDef = {}
				}

				this.tempRecipeDef.input = this.match[1]

				this.match = null
				return true // Continue Reading
			}

			// Match OUT
			this.match = REG_RECIPEDEF_OUT.exec(line)
			if (this.match) {
				if (!this.tempRecipeDef) {
					this.tempRecipeDef = {}
				}

				if (!this.tempRecipeDef.outputs) {
					this.tempRecipeDef.outputs = new Set()
				}

				this.tempRecipeDef.outputs.add(this.match[1])
				this.match = null

				return true // Continue Reading
			}

			// Match recipe separator
			this.match = REG_RECIPEDEF_DIV.exec(line)
			if (this.match) {
				if (this.tempRecipeDef && this.tempRecipeDef.input && this.tempRecipeDef.outputs) {
					this.finalizeRecipe(
						this.tempRecipeDef.input
						, Array.from(this.tempRecipeDef.outputs.values())
						, this.tempRecipeDef.EUt
					)
				}

				this.tempRecipeDef = null
				this.match = null

				return true // Continue Reading
			}

			// Match the end of a block
			this.match = REG_RECIPEDEF_FINISH.exec(line)
			if (this.match) {
				if (this.match[1] !== this.currentMachine) {
					throw new Error(`Illegal block ending, expected FINISH ${this.currentMachine}`)
				}

				console.debug(`RecipeReader: finished reading ${this.currentMachine}`)

				this.match = null
				this.currentMachine = null
				this.currentMachineDef = null
				return false // Stop Reading
			}

			this.match = null
			return true
		} else {
			throw new Error("Not inside a RecipeDef block.")
		}

		throw new Error(`Unexpected expression: ${line}`)
	}
}