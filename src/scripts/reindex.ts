import * as fs from "fs"
import * as path from "path"
import { ReindexConfig } from "../config"
import { reindex } from "../reindex/reindex"

process.on('unhandledRejection', error => {
	throw error
})

const outputFilePath = path.join(ReindexConfig.outputDir, "database.json")

if (!fs.existsSync(ReindexConfig.outputDir)) {
	fs.mkdirSync(ReindexConfig.outputDir, { recursive: true })
}

if (fs.existsSync(outputFilePath)) {
	fs.unlinkSync(outputFilePath)
}

const outputStream = fs.createWriteStream(outputFilePath)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proto = RegExp.prototype as any
proto.toJSON = proto.toString

reindex().then((output) => {
	outputStream.write(JSON.stringify(output, null, "\t"))
	outputStream.end()
}).catch(err => { throw err })
