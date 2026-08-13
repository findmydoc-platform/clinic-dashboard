// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { createReviewSourceApiCommands } from "@/features/clinic-dashboard/reviews/browser/review-source-api"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("review source API", () => {
  it("encodes history cursors and maps the BFF cursor conflict", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ code: "REVIEW_HISTORY_CHANGED" }), {
          headers: { "content-type": "application/json" },
          status: 409,
        }),
    )
    vi.stubGlobal("fetch", fetcher)

    await expect(
      createReviewSourceApiCommands().loadHistory("review 1", "cursor/+ value"),
    ).rejects.toMatchObject({ kind: "history-changed" })
    expect(fetcher).toHaveBeenCalledWith(
      "/api/dashboard/reviews/review%201/history?cursor=cursor%2F%2B%20value",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin", redirect: "error" }),
    )
  })
})
