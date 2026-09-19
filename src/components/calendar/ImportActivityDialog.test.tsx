// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ImportActivityDialog } from "@/components/calendar/ImportActivityDialog"
import type { ImportContext } from "@/lib/import/save"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const fetchImportContext = vi.fn<(...args: unknown[]) => Promise<ImportContext>>()
const saveImportedRows = vi.fn()
vi.mock("@/lib/import/save", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/import/save")>()),
  fetchImportContext: (...args: unknown[]) => fetchImportContext(...args),
  saveImportedRows: (...args: unknown[]) => saveImportedRows(...args),
}))

// A run on Sep 19 (local time noon, so the date is the same in every timezone).
const TCX = `<TrainingCenterDatabase><Activities><Activity Sport="Running"><Id>2026-09-19T12:00:00</Id>
  <Lap StartTime="2026-09-19T12:00:00"><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>5000</DistanceMeters>
  <AverageHeartRateBpm><Value>148</Value></AverageHeartRateBpm></Lap></Activity></Activities></TrainingCenterDatabase>`

const context = (over: Partial<ImportContext> = {}): ImportContext => ({
  planned: [{ id: 7, target_date: "2026-09-19", title: "Easy run", discipline: "run", planned_duration_minutes: 30 }],
  completedPlannedIds: new Set(),
  existingExternalIds: new Set(),
  ...over,
})

function setup() {
  const onImported = vi.fn(async () => {})
  const onOpenChange = vi.fn()
  render(<ImportActivityDialog open onOpenChange={onOpenChange} onImported={onImported} />)
  const user = userEvent.setup({ applyAccept: false })
  const choose = (...files: File[]) => user.upload(screen.getByLabelText("Activity files"), files)
  return { onImported, onOpenChange, user, choose }
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  fetchImportContext.mockReset().mockResolvedValue(context())
  saveImportedRows.mockReset().mockImplementation(async (rows: unknown[]) => rows.length)
})

describe("ImportActivityDialog", () => {
  it("previews a file and says which planned workout it completes", async () => {
    const { choose } = setup()
    await choose(new File([TCX], "morning.tcx"))
    expect(await screen.findByText(/30 min · 5 km · 148 bpm · 6:00 \/km/)).toBeInTheDocument()
    expect(screen.getByText("Completes your planned run: Easy run")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Import 1 activity" })).toBeEnabled()
  })

  it("saves the chosen activities, refreshes the calendar and closes", async () => {
    const { choose, user, onImported, onOpenChange } = setup()
    await choose(new File([TCX], "morning.tcx"))
    await user.click(await screen.findByRole("button", { name: "Import 1 activity" }))

    await waitFor(() => expect(saveImportedRows).toHaveBeenCalledTimes(1))
    const [rows] = saveImportedRows.mock.calls[0]
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ plannedId: 7, discipline: "run", date: "2026-09-19" })
    expect(toastSuccess).toHaveBeenCalledWith("Imported 1 activity, 1 matched to your plan")
    expect(onImported).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("lets you leave an activity out", async () => {
    const { choose, user } = setup()
    await choose(new File([TCX], "morning.tcx"))
    await user.click(await screen.findByRole("checkbox", { name: "Import morning.tcx" }))
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled()
  })

  it("skips an activity that was imported before", async () => {
    const { choose } = setup()
    fetchImportContext.mockImplementation(async (_activities, ids) => context({ existingExternalIds: new Set(ids as string[]) }))
    await choose(new File([TCX], "morning.tcx"))
    expect(await screen.findByText("Already imported, skipped.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled()
  })

  it("saves it as an extra activity when nothing in the plan matches", async () => {
    fetchImportContext.mockResolvedValue(context({ planned: [] }))
    const { choose } = setup()
    await choose(new File([TCX], "morning.tcx"))
    expect(await screen.findByText(/no matching planned workout/i)).toBeInTheDocument()
  })

  it("explains a file it cannot read, but still previews the good ones", async () => {
    const { choose } = setup()
    await choose(new File([TCX], "morning.tcx"), new File(["x"], "notes.pdf"))
    expect(await screen.findByRole("alert")).toHaveTextContent("notes.pdf: only .fit, .tcx and .gpx files can be imported.")
    expect(screen.getByRole("button", { name: "Import 1 activity" })).toBeEnabled()
  })

  it("shows the reason when saving fails and keeps the preview", async () => {
    saveImportedRows.mockRejectedValue(new Error("duplicate key value"))
    const { choose, user, onImported } = setup()
    await choose(new File([TCX], "morning.tcx"))
    await user.click(await screen.findByRole("button", { name: "Import 1 activity" }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("duplicate key value"))
    expect(onImported).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Import 1 activity" })).toBeEnabled()
  })
})
