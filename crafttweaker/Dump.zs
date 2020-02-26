#priority -10
import mods.gregtech.recipe.RecipeMap;

var machines = ["centrifuge", "orewasher", "macerator", "thermal_centrifuge", "chemical_bath", "electrolyzer"] as string[];

for machine in machines {
	var recipeMap = RecipeMap.getByName(machine) as RecipeMap;
	print("// BEGIN " + machine);
	for i, rec in recipeMap.recipes {
		for j, input in rec.inputs {
			for mItem in input.matchingItems {
				if (!isNull(mItem.ores) && mItem.ores.length > 0) {
					print("IN " + mItem.ores[0].name);
				}
			}
		}
		for j, output in rec.outputs {
			if (!isNull(output.ores) && output.ores.length > 0) {
				print("OUT " + output.ores[0].name);
			}
		}

		for j, chanced in rec.changedOutputs {
			if (!isNull(chanced.output.ores) && chanced.output.ores.length > 0) {
				print("OUT " + chanced.output.ores[0].name);
			}
		}
		print("EUT " + (rec.EUt as string));
		print("---");
	}
	print("// FINISH " + machine);
}