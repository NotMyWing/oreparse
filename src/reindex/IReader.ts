export interface Reader {
	pre(line: string): boolean;
	post(line: string): boolean;
}