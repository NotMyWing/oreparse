import path = require("path")

export const ReindexConfig = {
	inputDir: path.join(__dirname, "../reindex_src")
	, outputDir: path.join(__dirname, "../reindex_dist")
}

const yeetOre = (ore: string): RegExp[] => {
	return [
		new RegExp(`dustPure${ore}`, "ig")
		, new RegExp(`dustImpure${ore}`, "ig")
		, new RegExp(`crushedPurified${ore}`, "ig")
		, new RegExp(`crushedCentrifuged${ore}`, "ig")
		, new RegExp(`crushed${ore}`, "ig")
		, new RegExp(`ore${ore}`, "ig")
	]
}

const yeetDust = (dust: string): RegExp => {
	return new RegExp(`dust${dust}`, "ig")
}

export const OreFilter = {
	oreDictionaryBlackList: [
		/^dust(.+?)Magnetic$/ig
		, /dyeBlue/ig
		, ...yeetOre("Bornite")
		, ...yeetOre("BlueTopaz")
		, yeetDust("BlueTopaz")
		, ...yeetOre("Topaz")
		, yeetDust("Topaz")
		, ...yeetOre("Opal")
		, yeetDust("Opal")
		, ...yeetOre("Amethyst")
		, yeetDust("Amethyst")
		, ...yeetOre("Naquadah")
		, ...yeetOre("NaquadahEnriched")
		, yeetDust("Endstone")
		, yeetDust("Netherrack")
		, yeetDust("GalliumArsenide")
		, yeetDust("Fireclay")
		, yeetDust("Brick")
		, yeetDust("Stone")
		, /Blaze/ig
		, /Blizz/ig
		, /Basalz/ig
		, /Blitz/ig
		, /EnderEye/ig
		, /EnderPearl/ig
		, yeetDust("GraniteRed")
		, yeetDust("Marble")
		, yeetDust("Granite")
		, yeetDust("TinySiliconDioxide")
		, yeetDust("TinyFlint")
	]

	, oreDictionaryReplacements: new Map([
		[/^oreSand/, "ore"]
		, [/^oreGravel/, "ore"]
		, [/^oreBasalt/, "ore"]
		, [/^oreMarble/, "ore"]
		, [/^oreGranite/, "ore"]
		, [/^oreEndstone/, "ore"]
		, [/^oreRedgranite/, "ore"]
		, [/^oreNetherrack/, "ore"]
		, [/^oreBlackgranite/, "ore"]
		, [/^(.+?)NaquadahEnriched/, "$1EnrichedNaquadah"]
	])

	, majorSources: [
		/^dustRareEarth$/
		, /^ore/
		, /^dustPlatinumGroupSludge$/
		, /^shipTier/
	]
}
