// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { InlineTextDiff } from "@/components/ui/inline-text-diff"

describe("InlineTextDiff", () => {
  afterEach(cleanup)

  it("renders unchanged, removed and added character fragments semantically", () => {
    const { container } = render(<InlineTextDiff after="medical technologies" before="medical technology" />)

    expect(container.querySelector("del")).toHaveTextContent("y")
    expect(container.querySelector("ins")).toHaveTextContent("ies")
    expect(container.querySelector("del .sr-only")).toHaveTextContent("Removed:")
    expect(container.querySelector("ins .sr-only")).toHaveTextContent("Added:")
  })
})
