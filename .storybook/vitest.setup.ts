import "@testing-library/jest-dom/vitest"

// Headless runners may background the test tab while stories exercise foreground notification reads.
Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
