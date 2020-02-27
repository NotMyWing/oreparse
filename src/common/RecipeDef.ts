export interface ProductDef {
	machine: string;
	EUt: number;
}

export interface ProductCollection { [key: string]: ProductDef }

export interface RecipeEntryDef {
	prettyName: string;
	major?: boolean;
	products?: ProductCollection;
	producedBy?: ProductCollection;
}

export type RecipeDefCollection = { [key: string]: RecipeEntryDef };
