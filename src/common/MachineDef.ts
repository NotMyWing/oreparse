export interface MachineDef {
	prettyName?: string;
	inputWhiteList?: Array<RegExp>;
	outputWhiteList?: Array<RegExp>;
}

export type MachineDefCollection = { [key: string]: MachineDef };