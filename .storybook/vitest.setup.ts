import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"

afterEach(() => {
  for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close()
})
