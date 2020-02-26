import { createInterface } from "readline"
import { join } from "path"
import { MachineDefReader } from "./MachineDefReader"
import { readdirSync, createReadStream } from "fs"
import { Reader } from "./IReader"
import { RecipeDatabase } from "../common/RecipeDatabase"
import { RecipeDefReader } from "./RecipeDefReader"
import { ReindexConfig } from "../config"

const REG_CRAFTTWEAKER_BULLSHIT = new RegExp(`^${"\\[[^\\]]+\\]".repeat(3)}`)

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


	// Step Two: Prune items that cannot be produced.
	Object.keys(output.recipeDefs).forEach(key => {
		const def = output.recipeDefs[key]

		if (!def.producedBy && !def.major) {
			console.debug(`Pruning ${def.prettyName || key} (dead-end)`)
		}
	})

	return output
}
