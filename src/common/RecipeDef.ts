export interface ProductCollection { [key: string]: string }

export interface RecipeEntryDef {
	prettyName: string;
	major?: boolean;
	products?: ProductCollection;
	producedBy?: ProductCollection;
}

export type RecipeDefCollection = { [key: string]: RecipeEntryDef };
