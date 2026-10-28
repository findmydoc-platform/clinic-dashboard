import type { ClinicProfileSnapshot } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-source"

// Independent response examples. No runtime schemas, field constants or clone functions supply the oracle.
function minimalResponse() {
  return {
    availableCities: [],
    published: {
      address: { country: { code: "TR", name: "Türkiye" }, houseNumber: "", street: "", zipCode: "" },
      descriptionText: "",
      name: "",
      revision: 0,
      supportedLanguages: [],
    },
  }
}

function minimalExpected(): ClinicProfileSnapshot {
  return {
    availableCities: [],
    published: {
      address: { country: { code: "TR", name: "Türkiye" }, houseNumber: "", street: "", zipCode: "" },
      descriptionText: "",
      name: "",
      revision: 0,
      supportedLanguages: [],
    },
  }
}

function responseWeek() {
  return {
    monday: { opensAt: "", closesAt: "", isClosed: true },
    tuesday: { opensAt: "", closesAt: "", isClosed: true },
    wednesday: { opensAt: "", closesAt: "", isClosed: true },
    thursday: { opensAt: "", closesAt: "", isClosed: true },
    friday: { opensAt: "", closesAt: "", isClosed: true },
    saturday: { opensAt: "", closesAt: "", isClosed: true },
    sunday: { opensAt: "", closesAt: "", isClosed: true },
  }
}

function expectedWeek() {
  return {
    monday: { opensAt: "", closesAt: "", isClosed: true },
    tuesday: { opensAt: "", closesAt: "", isClosed: true },
    wednesday: { opensAt: "", closesAt: "", isClosed: true },
    thursday: { opensAt: "", closesAt: "", isClosed: true },
    friday: { opensAt: "", closesAt: "", isClosed: true },
    saturday: { opensAt: "", closesAt: "", isClosed: true },
    sunday: { opensAt: "", closesAt: "", isClosed: true },
  }
}

export type ClinicProfileResponseCase = Readonly<{
  name: string
  body: unknown
  expected?: ClinicProfileSnapshot
}>

export const transformedClinicProfileResponseCase = {
  name: "trim city names independently while preserving other text, zeros and list order",
  body: {
    availableCities: [
      { id: "z-city", name: "  Catalog Z  " },
      { id: "a-city", name: "\tCatalog A\n" },
    ],
    published: {
      address: {
        city: { id: "a-city", name: "  Published alias  " },
        country: { code: "TR", name: "Türkiye" },
        houseNumber: "  07 ",
        street: "  Street\n",
        zipCode: "00123",
      },
      descriptionText: "  Published\n",
      name: "  Clinic  ",
      revision: 4,
      supportedLanguages: ["turkish", "english", "german"],
    },
    draft: {
      address: {
        city: { id: "z-city", name: "\tDraft alias\n" },
        country: { code: "TR", name: "Türkiye" },
        houseNumber: " 9 ",
        street: " Draft street ",
        zipCode: "00007",
      },
      descriptionText: " Draft\n",
      name: " Draft ",
      revision: 2,
      basePublishedRevision: 1,
      supportedLanguages: ["japanese", "arabic"],
    },
  },
  expected: {
    availableCities: [
      { id: "z-city", name: "Catalog Z" },
      { id: "a-city", name: "Catalog A" },
    ],
    published: {
      address: {
        city: { id: "a-city", name: "Published alias" },
        country: { code: "TR", name: "Türkiye" },
        houseNumber: "  07 ",
        street: "  Street\n",
        zipCode: "00123",
      },
      descriptionText: "  Published\n",
      name: "  Clinic  ",
      revision: 4,
      supportedLanguages: ["turkish", "english", "german"],
    },
    draft: {
      address: {
        city: { id: "z-city", name: "Draft alias" },
        country: { code: "TR", name: "Türkiye" },
        houseNumber: " 9 ",
        street: " Draft street ",
        zipCode: "00007",
      },
      descriptionText: " Draft\n",
      name: " Draft ",
      revision: 2,
      basePublishedRevision: 1,
      supportedLanguages: ["japanese", "arabic"],
    },
  },
} satisfies ClinicProfileResponseCase

export const clinicProfileResponseCases: ClinicProfileResponseCase[] = [
  {
    name: "minimal published profile with empty text, languages and no optional fields",
    body: minimalResponse(),
    expected: minimalExpected(),
  },
  transformedClinicProfileResponseCase,
  {
    name: "incomplete saved draft with a higher base revision remains readable",
    body: {
      ...minimalResponse(),
      draft: { ...minimalResponse().published, revision: 0, basePublishedRevision: 9 },
    },
    expected: {
      ...minimalExpected(),
      draft: { ...minimalExpected().published, revision: 0, basePublishedRevision: 9 },
    },
  },
  {
    name: "saved draft with an older base revision remains readable",
    body: {
      ...minimalResponse(),
      published: { ...minimalResponse().published, revision: 8 },
      draft: { ...minimalResponse().published, revision: 3, basePublishedRevision: 2 },
    },
    expected: {
      ...minimalExpected(),
      published: { ...minimalExpected().published, revision: 8 },
      draft: { ...minimalExpected().published, revision: 3, basePublishedRevision: 2 },
    },
  },
  {
    name: "all twelve supported languages retain their unsorted order",
    body: {
      ...minimalResponse(),
      published: {
        ...minimalResponse().published,
        supportedLanguages: [
          "korean",
          "japanese",
          "chinese",
          "arabic",
          "russian",
          "turkish",
          "italian",
          "spanish",
          "french",
          "english",
          "german",
          "portuguese",
        ],
      },
    },
    expected: {
      ...minimalExpected(),
      published: {
        ...minimalExpected().published,
        supportedLanguages: [
          "korean",
          "japanese",
          "chinese",
          "arabic",
          "russian",
          "turkish",
          "italian",
          "spanish",
          "french",
          "english",
          "german",
          "portuguese",
        ],
      },
    },
  },
  {
    name: "all closed weekdays remain present in published profile and draft",
    body: {
      ...minimalResponse(),
      published: { ...minimalResponse().published, openingHours: responseWeek() },
      draft: {
        ...minimalResponse().published,
        openingHours: responseWeek(),
        revision: 1,
        basePublishedRevision: 0,
      },
    },
    expected: {
      ...minimalExpected(),
      published: { ...minimalExpected().published, openingHours: expectedWeek() },
      draft: {
        ...minimalExpected().published,
        openingHours: expectedWeek(),
        revision: 1,
        basePublishedRevision: 0,
      },
    },
  },
  {
    name: "published interval accepts the earliest and latest valid times",
    body: {
      ...minimalResponse(),
      published: {
        ...minimalResponse().published,
        openingHours: { ...responseWeek(), monday: { opensAt: "00:00", closesAt: "23:59", isClosed: false } },
      },
    },
    expected: {
      ...minimalExpected(),
      published: {
        ...minimalExpected().published,
        openingHours: { ...expectedWeek(), monday: { opensAt: "00:00", closesAt: "23:59", isClosed: false } },
      },
    },
  },
]

for (const [name, opensAt, closesAt] of [
  ["both times missing", "", ""],
  ["opening time missing", "", "17:00"],
  ["closing time missing", "09:00", ""],
  ["equal times", "09:00", "09:00"],
  ["reversed times", "17:00", "09:00"],
] as const) {
  clinicProfileResponseCases.push(
    {
      name: `open draft with ${name} remains readable`,
      body: {
        ...minimalResponse(),
        draft: {
          ...minimalResponse().published,
          revision: 1,
          basePublishedRevision: 0,
          openingHours: { ...responseWeek(), monday: { isClosed: false, opensAt, closesAt } },
        },
      },
      expected: {
        ...minimalExpected(),
        draft: {
          ...minimalExpected().published,
          revision: 1,
          basePublishedRevision: 0,
          openingHours: { ...expectedWeek(), monday: { isClosed: false, opensAt, closesAt } },
        },
      },
    },
    {
      name: `published open day rejects ${name}`,
      body: {
        ...minimalResponse(),
        published: {
          ...minimalResponse().published,
          openingHours: { ...responseWeek(), monday: { isClosed: false, opensAt, closesAt } },
        },
      },
    },
  )
}

// Literal bounds come from the approved response specification, not production constants.
for (const [field, maximum] of [
  ["name", 180],
  ["descriptionText", 10_000],
] as const) {
  clinicProfileResponseCases.push(
    {
      name: `${field} accepts ${maximum} characters`,
      body: {
        ...minimalResponse(),
        published: { ...minimalResponse().published, [field]: "x".repeat(maximum) },
      },
      expected: {
        ...minimalExpected(),
        published: { ...minimalExpected().published, [field]: "x".repeat(maximum) },
      },
    },
    {
      name: `${field} rejects ${maximum + 1} characters`,
      body: {
        ...minimalResponse(),
        published: { ...minimalResponse().published, [field]: "x".repeat(maximum + 1) },
      },
    },
  )
}
for (const [field, maximum] of [
  ["houseNumber", 40],
  ["street", 200],
  ["zipCode", 32],
] as const) {
  clinicProfileResponseCases.push(
    {
      name: `${field} accepts ${maximum} characters`,
      body: {
        ...minimalResponse(),
        published: {
          ...minimalResponse().published,
          address: { ...minimalResponse().published.address, [field]: "0".repeat(maximum) },
        },
      },
      expected: {
        ...minimalExpected(),
        published: {
          ...minimalExpected().published,
          address: { ...minimalExpected().published.address, [field]: "0".repeat(maximum) },
        },
      },
    },
    {
      name: `${field} rejects ${maximum + 1} characters`,
      body: {
        ...minimalResponse(),
        published: {
          ...minimalResponse().published,
          address: { ...minimalResponse().published.address, [field]: "0".repeat(maximum + 1) },
        },
      },
    },
  )
}
for (const id of ["-", "AZaz09_-", "i".repeat(128)]) {
  clinicProfileResponseCases.push({
    name: `permitted city ID of length ${id.length}`,
    body: {
      ...minimalResponse(),
      availableCities: [{ id, name: "City" }],
      published: {
        ...minimalResponse().published,
        address: { ...minimalResponse().published.address, city: { id, name: "Alias" } },
      },
    },
    expected: {
      ...minimalExpected(),
      availableCities: [{ id, name: "City" }],
      published: {
        ...minimalExpected().published,
        address: { ...minimalExpected().published.address, city: { id, name: "Alias" } },
      },
    },
  })
}
clinicProfileResponseCases.push(
  {
    name: "city names accept 160 characters after independent trimming",
    body: {
      ...minimalResponse(),
      availableCities: [{ id: "city", name: `  ${"c".repeat(160)}  ` }],
      published: {
        ...minimalResponse().published,
        address: {
          ...minimalResponse().published.address,
          city: { id: "city", name: `\t${"p".repeat(160)}\n` },
        },
      },
    },
    expected: {
      ...minimalExpected(),
      availableCities: [{ id: "city", name: "c".repeat(160) }],
      published: {
        ...minimalExpected().published,
        address: { ...minimalExpected().published.address, city: { id: "city", name: "p".repeat(160) } },
      },
    },
  },
  {
    name: "catalog accepts 5000 unique city entries in supplied order",
    body: {
      ...minimalResponse(),
      availableCities: Array.from({ length: 5000 }, (_, index) => ({
        id: `city-${5000 - index}`,
        name: `City ${5000 - index}`,
      })),
    },
    expected: {
      ...minimalExpected(),
      availableCities: Array.from({ length: 5000 }, (_, index) => ({
        id: `city-${5000 - index}`,
        name: `City ${5000 - index}`,
      })),
    },
  },
  {
    name: "catalog rejects 5001 unique city entries",
    body: {
      ...minimalResponse(),
      availableCities: Array.from({ length: 5001 }, (_, index) => ({
        id: `city-${index}`,
        name: `City ${index}`,
      })),
    },
  },
)

for (const [name, body] of [
  ["snapshot extra field", { ...minimalResponse(), extra: true }],
  [
    "catalog city extra field",
    { ...minimalResponse(), availableCities: [{ id: "city", name: "City", extra: true }] },
  ],
  [
    "duplicate catalog IDs even with different names",
    {
      ...minimalResponse(),
      availableCities: [
        { id: "city", name: "First" },
        { id: "city", name: "Second" },
      ],
    },
  ],
  ["null snapshot", null],
  ["array snapshot", []],
  ["string snapshot", "profile"],
  ["null catalog", { ...minimalResponse(), availableCities: null }],
  ["object catalog", { ...minimalResponse(), availableCities: {} }],
  ["missing catalog", { published: minimalResponse().published }],
  ["missing published profile", { availableCities: [] }],
] as const)
  clinicProfileResponseCases.push({ name: `rejects ${name}`, body })

for (const city of [
  null,
  "city",
  {},
  { id: "city" },
  { name: "City" },
  { id: null, name: "City" },
  { id: 1, name: "City" },
  { id: "", name: "City" },
  { id: "i".repeat(129), name: "City" },
  { id: "city.id", name: "City" },
  { id: " city", name: "City" },
  { id: "İstanbul", name: "City" },
  { id: "city", name: null },
  { id: "city", name: 3 },
  { id: "city", name: "" },
  { id: "city", name: " \t\n" },
  { id: "city", name: "c".repeat(161) },
]) {
  clinicProfileResponseCases.push({
    name: `catalog rejects city ${JSON.stringify(city)}`,
    body: { ...minimalResponse(), availableCities: [city] },
  })
}

for (const profileKey of ["published", "draft"] as const) {
  const profile =
    profileKey === "published"
      ? minimalResponse().published
      : { ...minimalResponse().published, revision: 1, basePublishedRevision: 0 }
  for (const [name, value] of [
    ["extra profile field", { ...profile, extra: true }],
    ["extra address field", { ...profile, address: { ...profile.address, extra: true } }],
    [
      "extra country field",
      { ...profile, address: { ...profile.address, country: { code: "TR", name: "Türkiye", extra: true } } },
    ],
    [
      "extra profile city field",
      { ...profile, address: { ...profile.address, city: { id: "city", name: "City", extra: true } } },
    ],
    [
      "foreign city ID",
      { ...profile, address: { ...profile.address, city: { id: "foreign", name: "Foreign" } } },
    ],
    [
      "wrong country code",
      { ...profile, address: { ...profile.address, country: { code: "DE", name: "Türkiye" } } },
    ],
    [
      "wrong country name",
      { ...profile, address: { ...profile.address, country: { code: "TR", name: "Turkey" } } },
    ],
    ["null country", { ...profile, address: { ...profile.address, country: null } }],
    ["wrong country type", { ...profile, address: { ...profile.address, country: "TR" } }],
    ["null city", { ...profile, address: { ...profile.address, city: null } }],
    ["wrong city type", { ...profile, address: { ...profile.address, city: "city" } }],
    [
      "profile city name too long",
      { ...profile, address: { ...profile.address, city: { id: "city", name: "p".repeat(161) } } },
    ],
    [
      "profile city name empty after trimming",
      { ...profile, address: { ...profile.address, city: { id: "city", name: "  " } } },
    ],
    [
      "profile city ID too long",
      { ...profile, address: { ...profile.address, city: { id: "i".repeat(129), name: "City" } } },
    ],
    ["duplicate languages", { ...profile, supportedLanguages: ["english", "english"] }],
    ["unknown language", { ...profile, supportedLanguages: ["klingon"] }],
    [
      "thirteen languages",
      {
        ...profile,
        supportedLanguages: [
          "german",
          "english",
          "french",
          "spanish",
          "italian",
          "turkish",
          "russian",
          "arabic",
          "chinese",
          "japanese",
          "korean",
          "portuguese",
          "english",
        ],
      },
    ],
    ["null language item", { ...profile, supportedLanguages: [null] }],
    ["extra week field", { ...profile, openingHours: { ...responseWeek(), extra: true } }],
    [
      "extra day field",
      {
        ...profile,
        openingHours: {
          ...responseWeek(),
          monday: { opensAt: "", closesAt: "", isClosed: true, extra: true },
        },
      },
    ],
    [
      "missing weekday",
      {
        ...profile,
        openingHours: {
          monday: responseWeek().monday,
          tuesday: responseWeek().tuesday,
          wednesday: responseWeek().wednesday,
          thursday: responseWeek().thursday,
          friday: responseWeek().friday,
          saturday: responseWeek().saturday,
        },
      },
    ],
    [
      "closed day with opening time",
      {
        ...profile,
        openingHours: { ...responseWeek(), monday: { opensAt: "09:00", closesAt: "", isClosed: true } },
      },
    ],
    [
      "closed day with closing time",
      {
        ...profile,
        openingHours: { ...responseWeek(), monday: { opensAt: "", closesAt: "17:00", isClosed: true } },
      },
    ],
    ["null weekday", { ...profile, openingHours: { ...responseWeek(), monday: null } }],
    [
      "nonboolean closed flag",
      {
        ...profile,
        openingHours: { ...responseWeek(), monday: { opensAt: "", closesAt: "", isClosed: "true" } },
      },
    ],
    ["negative revision", { ...profile, revision: -1 }],
    ["fractional revision", { ...profile, revision: 0.5 }],
  ] as const)
    clinicProfileResponseCases.push({
      name: `${profileKey} rejects ${name}`,
      body: { ...minimalResponse(), availableCities: [{ id: "city", name: "City" }], [profileKey]: value },
    })

  if (profileKey === "draft") continue

  for (const field of [
    "name",
    "descriptionText",
    "supportedLanguages",
    "revision",
    "address",
    "openingHours",
  ] as const) {
    clinicProfileResponseCases.push(
      {
        name: `${profileKey} rejects null ${field}`,
        body: { ...minimalResponse(), [profileKey]: { ...profile, [field]: null } },
      },
      {
        name: `${profileKey} rejects wrong type for ${field}`,
        body: { ...minimalResponse(), [profileKey]: { ...profile, [field]: field === "revision" ? "0" : 7 } },
      },
    )
  }
  for (const field of ["houseNumber", "street", "zipCode"] as const) {
    clinicProfileResponseCases.push(
      {
        name: `${profileKey} rejects null ${field}`,
        body: {
          ...minimalResponse(),
          [profileKey]: { ...profile, address: { ...profile.address, [field]: null } },
        },
      },
      {
        name: `${profileKey} rejects nonstring ${field}`,
        body: {
          ...minimalResponse(),
          [profileKey]: { ...profile, address: { ...profile.address, [field]: 0 } },
        },
      },
    )
  }
  for (const value of ["24:00", "23:60", "9:00", "09:0", " 09:00", "09:00 ", "00:00:00", null, 900]) {
    clinicProfileResponseCases.push(
      {
        name: `${profileKey} rejects malformed opening time ${JSON.stringify(value)}`,
        body: {
          ...minimalResponse(),
          [profileKey]: {
            ...profile,
            openingHours: {
              ...responseWeek(),
              monday: { opensAt: value, closesAt: "17:00", isClosed: false },
            },
          },
        },
      },
      {
        name: `${profileKey} rejects malformed closing time ${JSON.stringify(value)}`,
        body: {
          ...minimalResponse(),
          [profileKey]: {
            ...profile,
            openingHours: {
              ...responseWeek(),
              monday: { opensAt: "09:00", closesAt: value, isClosed: false },
            },
          },
        },
      },
    )
  }
  clinicProfileResponseCases.push(
    { name: `${profileKey} rejects null profile`, body: { ...minimalResponse(), [profileKey]: null } },
    {
      name: `${profileKey} rejects nonobject profile`,
      body: { ...minimalResponse(), [profileKey]: "profile" },
    },
  )
}
for (const basePublishedRevision of [-1, 0.5, null, "0"]) {
  clinicProfileResponseCases.push({
    name: `draft rejects invalid base revision ${JSON.stringify(basePublishedRevision)}`,
    body: { ...minimalResponse(), draft: { ...minimalResponse().published, basePublishedRevision } },
  })
}

clinicProfileResponseCases.push({
  name: "open draft rejects malformed time despite relaxed interval requirements",
  body: {
    ...minimalResponse(),
    draft: {
      ...minimalResponse().published,
      basePublishedRevision: 0,
      openingHours: {
        ...responseWeek(),
        monday: { isClosed: false, opensAt: "24:00", closesAt: "" },
      },
    },
  },
})
