import { expect, test, type Page, type Route } from "../fixtures/controlled-profile-scenario"

const second = "controlled-second-clinic"
const targets = [
  { kind: "inquiry", section: "messages", id: "second-inquiry-lukas-weber" },
  { kind: "review", section: "reviews", id: `${second}-seed-review-01` },
] as const
async function acknowledgeFixture(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: {
      "Cache-Control": "private, no-store",
      "X-Findmydoc-Clinic-Notifications-Support": "clinic-notifications-v1",
    },
    json: {
      contractVersion: "clinic-notifications-v1",
      serverTime: new Date().toISOString(),
      acknowledged: true,
    },
  })
}
async function signIn(page: Page, target?: string) {
  await page.goto(target ?? "/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/clinics\//)
}
async function targetNotification(
  page: Page,
  target: (typeof targets)[number],
  recordId: string = target.id,
) {
  let originalSelection: string[] | undefined
  await page.route("**/api/notifications?mode=page&view=unread", async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    const item = body.items.find((entry: { clinic: { id: string } }) => entry.clinic.id === second)
    originalSelection ??= item.members.map((member: { notificationId: string }) => member.notificationId)
    item.destination =
      target.kind === "inquiry"
        ? { kind: "inquiry", inquiryId: recordId, anchor: { kind: "message", id: "absent-optional-anchor" } }
        : { kind: "review", reviewId: recordId, anchor: { kind: "response", id: "absent-optional-anchor" } }
    item.display = {
      eventLabel: target.kind === "inquiry" ? "New inquiry" : "New review",
      displayName: "Exact synthetic target",
    }
    item.members[0].sourceRecord = { kind: target.kind, id: recordId }
    item.members[0].eventType = target.kind === "inquiry" ? "inquiry_created" : "review_published"
    item.members[0].sourceOccurrence.kind = target.kind === "inquiry" ? "inquiry_audit" : "review_transition"
    await route.fulfill({ response, json: { ...body, items: [item], nextCursor: null } })
  })
  return () => originalSelection
}
test.beforeEach(async ({ context, baseURL, page }) => {
  await page.route("**/api/notifications/read", acknowledgeFixture)
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
})
test("a real clinic page remount retains the restricted original inquiry draft until explicit discard", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await signIn(page)
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name: "Second Controlled Clinic", exact: true }).click()
  await expect(page).toHaveURL(/controlled-second-clinic/)
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name: "Controlled Clinic", exact: true }).click()
  await expect(page).toHaveURL(/controlled-clinic/)
  await page.getByRole("button", { name: "Inquiries", exact: true }).click()
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  const detail = page.getByRole("region", { name: "Inquiry from Lukas Weber" })
  await detail.getByRole("textbox", { name: "Reply to patient" }).fill("Original private remount reply")
  await page.route("**/api/dashboard/clinics/controlled-clinic/inquiries/messages", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      json: { error: { code: "access-denied" } },
    }),
  )
  await detail.getByRole("button", { name: "Send reply" }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.dataset.navigationProbe = "same-browser-session"
  })
  await page.goBack()
  await expect(page).toHaveURL(/controlled-second-clinic/)
  expect(await page.evaluate(() => document.documentElement.dataset.navigationProbe)).toBe(
    "same-browser-session",
  )
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  const confirmation = page.getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
  await confirmation.getByRole("button", { name: "Stay restricted" }).click()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  await confirmation.getByRole("button", { name: "Discard and open clinic" }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toHaveCount(0)
  await page.getByRole("button", { name: /Second clinic Lukas Weber/ }).click()
  await expect(page.getByRole("textbox", { name: "Reply to patient" })).toHaveValue("")
  expect(errors).toEqual([])
})

for (const target of targets) {
  test(`preserves the validated exact ${target.kind} clinic target through login without acknowledging`, async ({
    page,
  }) => {
    let receipts = 0
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/notifications/read")
        receipts += 1
    })
    const path = `/clinics/${second}?section=${target.section}&${target.kind}=${target.id}`
    await signIn(page, path)
    await expect(page).toHaveURL(
      new RegExp(`${second}\\?section=${target.section}&${target.kind}=${target.id}$`),
    )
    if (target.kind === "review")
      await expect(page.getByRole("heading", { name: "Review details", exact: true })).toBeFocused()
    else
      await expect(
        page.getByRole("heading", { name: "Second clinic Lukas Weber", exact: true }),
      ).toBeVisible()
    expect(receipts).toBe(0)
  })

  test(`opens the exact cross-clinic ${target.kind} before its fixed receipt and tolerates a missing optional anchor`, async ({
    page,
  }) => {
    await signIn(page)
    const originalSelection = await targetNotification(page, target)
    const receipts: { ids: string[]; displayed: boolean }[] = []
    const historyReads: string[] = []
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith("/history")) historyReads.push(request.url())
    })
    await page.route("**/api/notifications/read", async (route) => {
      const heading = page.getByRole("heading", {
        name: target.kind === "review" ? "Review details" : "Second clinic Lukas Weber",
        exact: true,
      })
      receipts.push({
        ids: route.request().postDataJSON().notificationIds,
        displayed: await heading.evaluate(
          (element) => element.getClientRects().length > 0 && document.activeElement === element,
        ),
      })
      await acknowledgeFixture(route)
    })
    await page.getByRole("button", { name: /Notifications, .*unread/ }).click()
    await page
      .getByRole("button", {
        name: `Open ${target.kind === "inquiry" ? "New inquiry" : "New review"} from Exact synthetic target`,
        exact: true,
      })
      .click()
    await expect(page).toHaveURL(new RegExp(`/clinics/${second}\\?section=${target.section}`))
    if (target.kind === "review")
      await expect(page.getByRole("heading", { name: "Review details", exact: true })).toBeFocused()
    else
      await expect(
        page.getByRole("heading", { name: "Second clinic Lukas Weber", exact: true }),
      ).toBeFocused()
    await expect.poll(() => receipts.length).toBe(1)
    expect(receipts[0]).toEqual({ ids: originalSelection(), displayed: true })
    expect(historyReads).toEqual([])
    await expect(page.getByText(/(Inquiry|Review) opened\./)).toBeVisible()
  })
}

test("declining a cross-clinic notification preserves the current inquiry draft and creates no receipt", async ({
  page,
}) => {
  await signIn(page)
  await page.getByRole("button", { name: "Inquiries", exact: true }).click()
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  const reply = page
    .getByRole("region", { name: "Inquiry from Lukas Weber" })
    .getByRole("textbox", { name: "Reply to patient" })
  await reply.fill("Private unfinished original clinic reply.")
  await page.setViewportSize({ width: 375, height: 844 })
  await targetNotification(page, targets[1])
  let receipts = 0
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/notifications/read")
      receipts += 1
  })
  await page.getByRole("button", { name: /Notifications, .*unread/ }).click()
  await page.getByRole("button", { name: "Open New review from Exact synthetic target", exact: true }).click()
  const confirmation = page.getByRole("alertdialog")
  await expect(confirmation).toBeVisible()
  await page.screenshot({
    path: "output/playwright/238/notification-draft-confirmation-mobile.png",
    animations: "disabled",
  })
  await confirmation.getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(reply).toHaveValue("Private unfinished original clinic reply.")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  expect(receipts).toBe(0)
})

test("a real internal exact link uses the same dirty gate and keeps new-tab and download behavior", async ({
  page,
}) => {
  await signIn(page)
  await page.getByRole("button", { name: "Inquiries", exact: true }).click()
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  const reply = page
    .getByRole("region", { name: "Inquiry from Lukas Weber" })
    .getByRole("textbox", { name: "Reply to patient" })
  await reply.fill("Private draft before internal exact link.")
  await page.locator("[data-clinic-workspace]").evaluate((root) => {
    const link = document.createElement("a")
    link.href =
      "/clinics/controlled-second-clinic?section=reviews&review=controlled-second-clinic-seed-review-01"
    link.textContent = "Open exact synthetic clinic review"
    link.style.display = "block"
    link.style.minHeight = "44px"
    root.querySelector("main")!.prepend(link)
  })
  const link = page.getByRole("link", { name: "Open exact synthetic clinic review" })
  await link.evaluate((anchor) =>
    anchor.addEventListener("click", (event) => event.preventDefault(), { once: true }),
  )
  await link.click()
  await expect(page.getByRole("alertdialog")).not.toBeVisible()
  await expect(reply).toHaveValue("Private draft before internal exact link.")
  await link.click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(reply).toHaveValue("Private draft before internal exact link.")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await link.evaluate((anchor) => {
    anchor.setAttribute("target", "_blank")
  })
  const popupPromise = page.waitForEvent("popup")
  await link.click()
  const popup = await popupPromise
  await expect(popup).toHaveURL(/controlled-second-clinic/)
  await popup.close()
  await expect(page.getByRole("alertdialog")).not.toBeVisible()
  await expect(reply).toHaveValue("Private draft before internal exact link.")
  await link.evaluate((anchor) => {
    anchor.removeAttribute("target")
    anchor.setAttribute("download", "exact-clinic-link.html")
  })
  const downloadPromise = page.waitForEvent("download")
  await link.click()
  await downloadPromise
  await expect(page.getByRole("alertdialog")).not.toBeVisible()
  await expect(reply).toHaveValue("Private draft before internal exact link.")
  await link.evaluate((anchor) => anchor.removeAttribute("download"))
  let receipts = 0
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/notifications/read")
      receipts += 1
  })
  await link.click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: /Discard/ })
    .click()
  await expect(page.getByRole("heading", { name: "Review details", exact: true })).toBeFocused()
  await expect(page).toHaveURL(/controlled-second-clinic/)
  expect(receipts).toBe(0)
})

for (const target of targets) {
  test(`an open profile draft uses the shared gate before an exact cross-clinic ${target.kind}`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    let receipts = 0
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/notifications/read")
        receipts += 1
    })
    await signIn(page)
    await page.getByRole("button", { name: "Clinic profile", exact: true }).click()
    await page.getByRole("button", { name: /^(?:Edit profile|Continue editing)$/ }).click()
    const description = page.getByRole("textbox", { name: "Description", exact: true })
    const draft = `Private profile draft before exact ${target.kind}.`
    await description.fill(draft)
    await page.locator("[data-clinic-workspace]").evaluate((root, destination) => {
      const link = document.createElement("a")
      link.href = destination
      link.textContent = "Open exact synthetic clinic record"
      link.style.display = "block"
      link.style.minHeight = "44px"
      root.querySelector("main")!.prepend(link)
    }, `/clinics/${second}?section=${target.section}&${target.kind}=${target.id}`)
    const link = page.getByRole("link", { name: "Open exact synthetic clinic record" })
    await link.click()
    const leave = page.getByRole("alertdialog", { name: "Leave profile editing?" })
    await leave.getByRole("button", { name: "Keep editing" }).click()
    await expect(description).toHaveValue(draft)
    await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
    expect(receipts).toBe(0)
    await link.click()
    await leave.getByRole("button", { name: "Leave without saving" }).click()
    const heading = page.getByRole("heading", {
      name: target.kind === "inquiry" ? "Second clinic Lukas Weber" : "Review details",
      exact: true,
    })
    await expect(heading).toBeFocused()
    await expect(page).toHaveURL(new RegExp(`/clinics/${second}\\?section=${target.section}`))
    await page.getByRole("button", { name: "Clinic profile", exact: true }).click()
    await page.getByRole("button", { name: /^(?:Edit profile|Continue editing)$/ }).click()
    await expect(page.getByRole("textbox", { name: "Description", exact: true })).not.toHaveValue(draft)
    expect(receipts).toBe(0)
    expect(errors).toEqual([])
  })
}

for (const outcome of ["not_committed", "unknown"] as const) {
  test(`keeps the displayed exact review when its separate acknowledgement is ${outcome}`, async ({
    page,
  }) => {
    await signIn(page)
    const selection = await targetNotification(page, targets[1])
    const writes: string[][] = []
    await page.route("**/api/notifications/read", async (route) => {
      writes.push(route.request().postDataJSON().notificationIds)
      await route.fulfill({
        status: outcome === "not_committed" ? 403 : 503,
        contentType: "application/json",
        headers: { "X-Findmydoc-Clinic-Notifications-Support": "clinic-notifications-v1" },
        json: {
          contractVersion: "clinic-notifications-v1",
          error: { code: outcome === "not_committed" ? "CLINIC_ACCESS_DENIED" : "SERVICE_UNAVAILABLE" },
          writeOutcome: outcome,
        },
      })
    })
    await page.getByRole("button", { name: /Notifications, .*unread/ }).click()
    await page
      .getByRole("button", { name: "Open New review from Exact synthetic target", exact: true })
      .click()
    await expect(page.getByRole("heading", { name: "Review details", exact: true })).toBeVisible()
    await expect(
      page.getByRole("alert").filter({
        hasText: outcome === "unknown" ? "We couldn't confirm whether" : "Notifications weren't marked",
      }),
    ).toBeVisible()
    expect(writes).toEqual([selection()])
    await page.getByRole("button", { name: "View notification status", exact: true }).click()
    await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible()
    expect(writes).toHaveLength(1)
  })
}
for (const target of targets) {
  for (const unavailable of ["missing", "foreign"] as const) {
    test(`does not substitute or acknowledge an unavailable ${unavailable} ${target.kind}`, async ({
      page,
    }) => {
      await signIn(page)
      await targetNotification(
        page,
        target,
        unavailable === "missing"
          ? "missing-exact-record"
          : target.kind === "inquiry"
            ? "inquiry-lukas-weber"
            : "seed-review-01",
      )
      let writes = 0
      page.on("request", (request) => {
        if (request.method() === "POST" && new URL(request.url()).pathname === "/api/notifications/read")
          writes += 1
      })
      await page.getByRole("button", { name: /Notifications, .*unread/ }).click()
      await page
        .getByRole("button", {
          name: `Open ${target.kind === "inquiry" ? "New inquiry" : "New review"} from Exact synthetic target`,
          exact: true,
        })
        .click()
      await expect(
        page.getByRole("status").filter({
          hasText: `This ${target.kind} is unavailable. You can still mark the notification as read.`,
        }),
      ).toBeVisible()
      expect(writes).toBe(0)
      if (target.kind === "review")
        await expect(
          page.getByRole("region", { name: "Selected review" }).getByText("This review is unavailable."),
        ).toBeVisible()
      else
        await expect(
          page.getByRole("region", { name: "Inquiry from Second clinic Lukas Weber" }),
        ).toHaveCount(0)
    })
  }
}

test("drops an old exact detail after a newer manual clinic navigation and never acknowledges it", async ({
  page,
}) => {
  await signIn(page)
  await targetNotification(page, targets[1])
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested = false
  let completed = false
  let writes = 0
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/notifications/read")
      writes += 1
  })
  await page.route(`**/api/dashboard/clinics/${second}/reviews/${targets[1].id}`, async (route) => {
    const response = await route.fetch()
    requested = true
    await held
    try {
      await route.fulfill({ response })
    } catch {
      /* A newer clinic navigation aborts the old detail. */
    }
    completed = true
  })
  await page.getByRole("button", { name: /Notifications, .*unread/ }).click()
  await page.getByRole("button", { name: "Open New review from Exact synthetic target", exact: true }).click()
  await expect.poll(() => requested).toBe(true)
  expect(writes).toBe(0)
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name: "Controlled Clinic", exact: true }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic\?section=reviews$/)
  release()
  await expect.poll(() => completed).toBe(true)
  await expect(page.getByRole("region", { name: "Selected review" })).toHaveCount(0)
  expect(writes).toBe(0)
})

for (const theme of ["light", "dark"] as const) {
  test(`retains exact source identity, focus and responsive review display in ${theme}`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })
    await page.setViewportSize({ width: 375, height: 844 })
    await signIn(page)
    if (theme === "dark") {
      await page.getByRole("button", { name: "Open account menu for Alex Morgan" }).click()
      await page.getByRole("menuitemcheckbox", { name: "Dark mode" }).click()
      await page.keyboard.press("Escape")
      await expect(page.locator("html")).toHaveClass(/dark/)
    }
    await targetNotification(page, targets[1])
    await page.getByRole("button", { name: /Notifications, .*unread/ }).click()
    await page
      .getByRole("button", { name: "Open New review from Exact synthetic target", exact: true })
      .click()
    const heading = page.getByRole("heading", { name: "Review details", exact: true })
    await expect(heading).toBeFocused()
    await expect(
      page.getByRole("button", { name: /Current location: Second Controlled Clinic/ }),
    ).toBeVisible()
    await expect(page.getByText(/Review opened\. Marked as read\./)).toBeVisible()
    await page.getByRole("button", { name: "Dismiss notification status" }).click()
    for (const width of [320, 375, 640, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: width === 375 ? 540 : 844 })
      await expect(heading).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (width === 375) {
        const developmentChrome = await page.addStyleTag({
          content: "nextjs-portal { visibility: hidden !important; }",
        })
        await page.screenshot({
          path: `output/playwright/238/exact-review-mobile-${theme}.png`,
          animations: "disabled",
        })
        await developmentChrome.evaluate((element) => {
          element.parentNode?.removeChild(element)
        })
      }
    }
    expect(errors).toEqual([])
    await testInfo.attach(`controlled-runtime-${theme}`, {
      body: JSON.stringify({
        source: "controlled synthetic Dashboard browser/BFF",
        realPayloadSource: false,
        acknowledgementResponse:
          "isolated contract fixture; retained personal-clinic-notifications tests cover controlled BFF persistence",
        theme,
        widths: [320, 375, 640, 768, 1024, 1280],
        runtimeErrors: errors,
      }),
      contentType: "application/json",
    })
  })
}
