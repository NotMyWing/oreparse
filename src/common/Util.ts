import { MachineDef } from "./MachineDef"

export const getMachineDefName = (def: MachineDef): string | undefined => def.prettyName

const prettyNames = new Map([
	[/dustSmall(.+)/, "Small Pile of $1 Dust"]
	, [/dustTiny(.+)/, "Tiny Pile of $1 Dust"]
	, [/dustPure(.+)/, "Purified Pile of $1 Dust"]
	, [/dustImpure(.+)/, "Impure Pile of $1 Dust"]
	, [/crushedCentrifuged(.+)/, "Centrifuged $1 Ore"]
	, [/crushedPurified(.+)/, "Purified $1 Ore"]
	, [/crushed(.+)/, "Crushed $1 Ore"]
	, [/dust(.+)/, "$1 Dust"]
	, [/ore(.+)/, "$1 Ore"]
])

export const prettifyName = (name: string): string | undefined => {
	const key = Array.from(prettyNames.keys()).find(pattern => pattern.exec(name))

	if (key) {
		const value = prettyNames.get(key)

		return value ? name.replace(key, (_, first) => {
			return value.replace("$1", first
				.replace(/([A-Z])/g, " $1")
				.replace(/(\d+)/g,   " $1")
				.trim()
			)
		}) : undefined
	}

	return undefined
}