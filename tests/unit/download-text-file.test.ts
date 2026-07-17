// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { downloadTextFile } from "@/lib/browser/download-text-file"

function readBlobAsText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("error", () => reject(reader.error))
    reader.addEventListener("load", () => resolve(String(reader.result)))
    reader.readAsText(blob)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("download text file browser adapter", () => {
  it("creates, clicks, and revokes a downloadable Blob URL", async () => {
    const content = '"date","profileViews"\n"October 6","103"'
    const objectUrl = "blob:clinic-dashboard-profile-views"
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => objectUrl)
    const revokeObjectURL = vi.fn()
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })

    const link = document.createElement("a")
    const click = vi.spyOn(link, "click").mockImplementation(() => undefined)
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(link)

    downloadTextFile({
      content,
      fileName: "profile-views-7-days.csv",
      mimeType: "text/csv",
    })

    expect(createElement).toHaveBeenCalledWith("a")
    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    if (!(blob instanceof Blob)) throw new Error("Expected download content to be a Blob.")
    expect(blob.type).toBe("text/csv")
    expect(await readBlobAsText(blob)).toBe(content)
    expect(link.href).toBe(objectUrl)
    expect(link.download).toBe("profile-views-7-days.csv")
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl)
  })
})
