import { parseFit } from "@/lib/import/parse-fit"
import { parseGpx } from "@/lib/import/parse-gpx"
import { parseTcx } from "@/lib/import/parse-tcx"
import { ImportError, type ParsedActivity } from "@/lib/import/types"

export const ACCEPTED_EXTENSIONS = [".fit", ".tcx", ".gpx"]
/** Activity files are small (a long ride is a few MB); anything bigger is not one. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024

/** Reads one activity file and returns the activities inside it. Throws ImportError with a message fit to show. */
export async function parseActivityFile(file: File): Promise<ParsedActivity[]> {
  const name = file.name
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new ImportError(`${name}: only .fit, .tcx and .gpx files can be imported.`)
  }
  if (file.size > MAX_FILE_BYTES) throw new ImportError(`${name} is too large to import.`)

  const activities =
    ext === ".fit"
      ? await parseFit(await file.arrayBuffer(), name)
      : ext === ".tcx"
        ? parseTcx(await file.text(), name)
        : parseGpx(await file.text(), name)

  if (activities.length === 0) throw new ImportError(`No activity found in ${name}.`)
  return activities
}
