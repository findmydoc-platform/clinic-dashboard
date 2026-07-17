import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

const fixturePattern = {
  message: "Production code must not import Storybook or test fixtures.",
  regex: "(?:^|/)(?:fixtures|testing)(?:/|$)|\\.fixtures(?:\\.[cm]?[jt]sx?)?$",
}

const prototypeDataPattern = {
  message:
    "Runtime prototype data is composition-only; pass mapped inputs into features and use independent test fixtures.",
  regex: "(?:^|/)(?:[^/]+\\.prototype-data|prototype-data-source)(?:\\.[cm]?[jt]sx?)?$",
}

const runtimePrototypeCommandPattern = {
  message:
    "Runtime prototype commands are composition-only; pass a command contract into features and use command fakes in tests.",
  regex: "(?:^|/)(?:[^/]+\\.)?prototype-commands(?:\\.[cm]?[jt]sx?)?$",
}

const runtimePrototypePatterns = [prototypeDataPattern, runtimePrototypeCommandPattern]

const clinicDashboardRootPublicPattern = {
  message: "Feature production internals must not back-import the Clinic Dashboard root public contract.",
  regex: "^@/features/clinic-dashboard/public(?:\\.[cm]?[jt]sx?)?$",
}

const productionFeaturePatterns = [...runtimePrototypePatterns, clinicDashboardRootPublicPattern]
const clinicDashboardAreas = [
  "clinic-profile",
  "dashboard",
  "messages",
  "prototype",
  "reviews",
  "support",
  "workspace",
]

function sameAreaPublicPattern(area) {
  return {
    message: "Feature production internals must not import through their own area's public.ts contract.",
    regex: `^@/features/clinic-dashboard/${area}/public(?:\\.[cm]?[jt]sx?)?$`,
  }
}

const appRouterPattern = {
  message: "Feature components must not import App Router implementation files.",
  regex: "^@/app(?:/|$)",
}

const browserAdapterPattern = {
  message: "Feature components must not access browser-session or storage adapters directly.",
  regex: "(?:^|/)(?:browser-session|session-storage|local-storage)(?:\\.|/|$)",
}

const sharedUiPatterns = [
  {
    message: "Shared UI must remain domain-neutral.",
    regex: "^@/(?:app|features)(?:/|$)",
  },
  fixturePattern,
  ...runtimePrototypePatterns,
]

const featureComponentPatterns = [
  appRouterPattern,
  fixturePattern,
  ...runtimePrototypePatterns,
  clinicDashboardRootPublicPattern,
  browserAdapterPattern,
]

const featureStoryPatterns = [appRouterPattern, ...runtimePrototypePatterns, browserAdapterPattern]

const modelPatterns = [
  {
    message: "Pure feature models must not import React, Next.js, UI, providers, or hooks.",
    regex: "^(?:react|next)(?:/|$)|(?:^|/)(?:components|providers|hooks)(?:/|$)",
  },
  fixturePattern,
  ...runtimePrototypePatterns,
  clinicDashboardRootPublicPattern,
]

const modelGlobalThisRestrictions = [
  {
    message: "Pure feature models must not access browser globals through globalThis.",
    selector:
      "MemberExpression[object.name='globalThis'][computed=false][property.name=/^(crypto|document|localStorage|sessionStorage|window)$/]",
  },
  {
    message: "Pure feature models must not access browser globals through globalThis.",
    selector:
      "MemberExpression[object.name='globalThis'][computed=true][property.value=/^(crypto|document|localStorage|sessionStorage|window)$/]",
  },
]

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "coverage/**", "playwright-report/**", "storybook-static/**"]),
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: sharedUiPatterns }],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    ignores: [
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.tsx",
      "**/*.prototype-data.mapper.{ts,tsx}",
      "**/*.stories.{ts,tsx}",
      "**/*.{test,spec}.{ts,tsx}",
      "**/fixtures/**/*.{ts,tsx}",
      "**/testing/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: productionFeaturePatterns }],
    },
  },
  {
    files: [
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.tsx",
      "src/features/**/*.prototype-data.mapper.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: [clinicDashboardRootPublicPattern] }],
    },
  },
  {
    files: ["src/features/**/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: featureComponentPatterns }],
    },
  },
  {
    files: ["src/features/**/model/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        { message: "Pure feature models must not access Web Crypto.", name: "crypto" },
        { message: "Pure feature models must not access the DOM.", name: "document" },
        { message: "Pure feature models must not access browser storage.", name: "localStorage" },
        { message: "Pure feature models must not access browser storage.", name: "sessionStorage" },
        { message: "Pure feature models must not access browser globals.", name: "window" },
      ],
      "no-restricted-syntax": ["error", ...modelGlobalThisRestrictions],
    },
  },
  {
    files: ["src/features/**/model/**/*.{ts,tsx}"],
    ignores: ["**/*.prototype-data.mapper.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: modelPatterns }],
    },
  },
  {
    files: ["src/providers/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              message: "Domain-neutral providers must not import feature behavior.",
              regex: "^@/features(?:/|$)",
            },
          ],
        },
      ],
    },
  },
  ...clinicDashboardAreas.map((area) => ({
    files: [`src/features/clinic-dashboard/${area}/**/*.{ts,tsx}`],
    ignores: [
      `src/features/clinic-dashboard/${area}/public.{ts,tsx}`,
      `src/features/clinic-dashboard/${area}/**/*.stories.{ts,tsx}`,
      `src/features/clinic-dashboard/${area}/**/*.{test,spec}.{ts,tsx}`,
      `src/features/clinic-dashboard/${area}/fixtures/**/*.{ts,tsx}`,
      `src/features/clinic-dashboard/${area}/testing/**/*.{ts,tsx}`,
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: [sameAreaPublicPattern(area)] }],
    },
  })),
  ...clinicDashboardAreas.map((area) => ({
    files: [`src/features/clinic-dashboard/${area}/components/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...featureComponentPatterns, sameAreaPublicPattern(area)] },
      ],
    },
  })),
  {
    files: ["src/features/**/*.stories.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: featureStoryPatterns }],
    },
  },
  {
    files: [
      "src/**/fixtures/**/*.{ts,tsx}",
      "src/**/testing/**/*.{ts,tsx}",
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: runtimePrototypePatterns }],
    },
  },
])
