import { MachineDefCollection } from "./MachineDef"
import { RecipeDefCollection } from "./RecipeDef"

export interface RecipeDatabase {
	machineDefs: MachineDefCollection;
	recipeDefs: RecipeDefCollection;
}