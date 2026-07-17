import { createElement } from "react"
import type { Preview } from "@storybook/nextjs-vite"
import { StorybookTheme } from "../src/storybook/StorybookTheme"
import { storybookViewports } from "../src/storybook/viewports"
import "../src/app/globals.css"

const preview: Preview = {
  decorators: [
    (Story, context) =>
      createElement(
        StorybookTheme,
        { theme: context.globals.theme === "dark" ? "dark" : "light" },
        createElement(Story),
      ),
  ],
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: {
        dynamicTitle: true,
        icon: "mirror",
        items: [
          { title: "Light", value: "light" },
          { title: "Dark", value: "dark" },
        ],
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  tags: ["autodocs"],
  parameters: {
    a11y: {
      test: "error",
    },
    controls: {
      expanded: true,
    },
    layout: "centered",
    options: {
      storySort: {
        order: [
          "Foundations",
          "Shared",
          ["Atoms", "Molecules"],
          "Clinic Dashboard",
          [
            "Workspace",
            "Dashboard",
            "Messages",
            "Reviews",
            "Clinic Profile",
            "Support",
            "Journeys",
            "Atoms",
            "Molecules",
            "Templates",
          ],
          "*",
        ],
      },
    },
    viewport: {
      options: storybookViewports,
    },
  },
}

export default preview
