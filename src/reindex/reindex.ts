import { createInterface } from "readline"
import { join } from "path"
import { MachineDefReader } from "./MachineDefReader"
import { readdirSync, createReadStream } from "fs"
import { Reader } from "./IReader"
import { RecipeDatabase } from "../common/RecipeDatabase"
import { RecipeDefReader } from "./RecipeDefReader"
import { ReindexConfig } from "../config"

const REG_CRAFTTWEAKER_BULLSHIT = new RegExp(`^${"\\[[^\\]]+\\]".repeat(3)}`)
const REG_SMALLTINY_DUST = /^dustTiny(.+)|dustSmall(.+)$/

export const reindex = async (): Promise<RecipeDatabase> => {
	const output: RecipeDatabase = {
		machineDefs: {}
		, recipeDefs: {}
	}

	const readers: Reader[] = [
		new MachineDefReader(output),
		new RecipeDefReader(output)
	]
	
	let lastReader: Reader | undefined

	let debugLineId = 0
	let debugLine = ""
	let debugFile = ""
	
	const files = readdirSync(ReindexConfig.inputDir)
		.sort()

	while (files.length > 0) {
		const file = files.shift()
		if (!file) {
			break
		}

		const lineReader = createInterface({
			input: createReadStream(join(ReindexConfig.inputDir, file))
			, crlfDelay: Infinity
		})

		try {
			debugFile = file
			debugLineId = 0
			for await (let line of lineReader) {
				line = line
					.replace(REG_CRAFTTWEAKER_BULLSHIT, "")
					.trim()

				debugLineId++
				debugLine = line
		
				let reader: Reader | undefined
		
				if (lastReader?.pre(line)) {
					reader = lastReader
				} else {
					const matchedReaders = readers
						.filter(reader => reader !== lastReader)
						.filter(reader => reader.pre(line))
		
					if (matchedReaders.length > 0) {
						if (matchedReaders.length > 1) {
							throw "More than one reader."
						}
		
						reader = matchedReaders[0]
					}
				}
		
				if (reader?.post(line)) {
					lastReader = reader
				} else {
					lastReader = undefined
				}
			}
		} catch (err) {
			console.error(`Exception while reading ${debugFile}, line ${debugLineId}.`)
			console.error(`\n> ${debugLine}\n`)
			console.error(err.stack)
			
			process.exit(1)
		}
	}

	// Step Two: Auto-Generate Packager Recipes for Tiny and Small Piles
	Object.keys(output.recipeDefs).forEach(smallTinyDustKey => {
		const match = REG_SMALLTINY_DUST.exec(smallTinyDustKey)
		if (match) {
			const regularDustName = `dust${match[1] || match[2]}`
			const regularDustDef = output.recipeDefs[regularDustName]

			if (regularDustDef) {
				if (!regularDustDef.producedBy) {
					regularDustDef.producedBy = {}
				}
				regularDustDef.producedBy[smallTinyDustKey] = {
					machine: "packager"
					, EUt: 12
				}
			
				const smallTinyDustDef = output.recipeDefs[smallTinyDustKey]

				if (!smallTinyDustDef.products) {
					smallTinyDustDef.products = {}
				}
				smallTinyDustDef.products[regularDustName] = {
					machine: "packager"
					, EUt: 12
				}

				console.debug(`Generating Packager recipe for ${smallTinyDustKey}`)
			}			
		}
	})

	// Step Three: Prune items that cannot be produced.
	// Trust me, it's not that expensive.
	Object.keys(output.recipeDefs).forEach(key => {
		const def = output.recipeDefs[key]

		if (def && (!def.producedBy || Object.keys(def.producedBy).length == 0) && !def.major) {
			const toPrune = [key]

			Object.keys(output.recipeDefs).forEach(otherKey => {
				const otherDef = output.recipeDefs[otherKey]
				if (otherDef.producedBy && otherDef.producedBy[key]) {
					delete otherDef.producedBy[key]

					if (Object.keys(otherDef.producedBy).length == 0) {
						toPrune.push(otherKey)
					}
				}
			})

			toPrune.forEach(key => {
				console.debug(`Pruning ${output.recipeDefs[key].prettyName || key} (dead-end)`)

				delete output.recipeDefs[key]
			})
		}
	})

	return output
}
