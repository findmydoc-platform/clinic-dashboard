import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { createDoctorProfileDraft, saveDoctorProfileDraft } from "../../model/doctor-profile-editor"
import {
  createDoctorProfileCommandsFixture,
  doctorDirectoryFixture,
} from "../../testing/doctor-profile.fixtures"
import { DoctorProfileDialog } from "./DoctorProfileDialog"

const commands = createDoctorProfileCommandsFixture()

const meta = {
  args: {
    initialDoctor: doctorDirectoryFixture.doctors[0],
    medicalSpecialties: doctorDirectoryFixture.medicalSpecialties,
    onOpenChange: fn(),
    onSave: (draft, doctor) => saveDoctorProfileDraft(commands, draft, doctor),
    open: true,
  },
  component: DoctorProfileDialog,
  parameters: { layout: "fullscreen" },
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Doctor Profile Dialog",
} satisfies Meta<typeof DoctorProfileDialog>

export default meta
type Story = StoryObj<typeof meta>

export const EditDoctor: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const dialog = canvas.getByRole("dialog", { name: "Edit doctor" })

    await expect(within(dialog).getByRole("textbox", { name: "First name" })).toHaveValue("Sarah")
    await expect(within(dialog).getByRole("switch", { name: "Published profile" })).toBeChecked()
    await expect(within(dialog).getByRole("combobox", { name: "Specialty 1" })).toHaveValue(
      "specialty-dermatology",
    )
    await expect(within(dialog).getByRole("button", { name: "Remove MD – Doctor of Medicine" })).toBeVisible()
    await expect(within(dialog).getByRole("combobox", { name: "Languages" })).toBeVisible()
    await expect(within(dialog).getByLabelText("Profile photo")).toHaveAttribute("tabindex", "-1")
  },
}

export const CreateDoctor: Story = {
  args: {
    initialDoctor: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const dialog = canvas.getByRole("dialog", { name: "Add doctor" })
    const submit = within(dialog).getByRole("button", { name: "Add doctor" })

    await expect(submit).toBeEnabled()
    await userEvent.click(submit)
    await expect(within(dialog).getByText("Enter a first name.")).toBeVisible()
    await userEvent.type(within(dialog).getByRole("textbox", { name: "First name" }), "Lea")
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Last name" }), "Fischer")
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Gender" }), "female")
    await userEvent.type(within(dialog).getByRole("combobox", { name: "Qualifications" }), "MD{Enter}")
    await userEvent.type(within(dialog).getByRole("combobox", { name: "Languages" }), "Eng")
    await userEvent.click(within(dialog).getByRole("option", { name: "English" }))
    await expect(within(dialog).getByRole("button", { name: "Remove English" })).toBeVisible()
    await userEvent.click(within(dialog).getByRole("textbox", { name: "First name" }))
    await expect(submit).toBeEnabled()
    await expect(within(dialog).queryByText("Enter a first name.")).not.toBeInTheDocument()
  },
}

export const AddSpecialtyRow: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog", { name: "Edit doctor" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Add specialty" }))
    await expect(within(dialog).getByRole("combobox", { name: "Specialty 3" })).toHaveValue("")
    await expect(within(dialog).getByRole("combobox", { name: "Specialization level 3" })).toHaveValue("")
    await expect(within(dialog).getByRole("button", { name: "Discard specialty row 3" })).toBeVisible()
    await userEvent.click(within(dialog).getByRole("button", { name: "Save doctor" }))
    const invalidSpecialty = within(dialog).getByRole("combobox", { name: "Specialty 3" })
    await waitFor(() => expect(invalidSpecialty).toHaveFocus())
    await expect(invalidSpecialty).toHaveAttribute("aria-describedby", "doctor-specialties-error")
    await expect(within(dialog).getByText("Select a specialty for every added row.")).toBeVisible()
  },
}

export const PartialFailureKeepsDialogOpen: Story = {
  args: {
    initialDoctor: undefined,
    onSave: async (draft) => ({
      doctor: {
        active: false,
        firstName: draft.firstName,
        gender: draft.gender || "female",
        id: "doctor-partial",
        languages: draft.languages,
        lastName: draft.lastName,
        qualifications: draft.qualifications.split("\n"),
        specialties: [],
      },
      draft: { ...draft, doctorId: "doctor-partial" },
      failedSteps: ["save"],
      status: "partial",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const dialog = canvas.getByRole("dialog", { name: "Add doctor" })
    await userEvent.type(within(dialog).getByRole("textbox", { name: "First name" }), "Lea")
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Last name" }), "Fischer")
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Gender" }), "female")
    await userEvent.type(within(dialog).getByRole("combobox", { name: "Qualifications" }), "MD{Enter}")
    await userEvent.type(within(dialog).getByRole("combobox", { name: "Languages" }), "Eng")
    await userEvent.click(within(dialog).getByRole("option", { name: "English" }))
    await expect(within(dialog).getByRole("button", { name: "Remove English" })).toBeVisible()
    await userEvent.click(within(dialog).getByRole("textbox", { name: "First name" }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Add doctor" }))

    await expect(
      within(canvas.getByRole("dialog", { name: "Edit doctor" })).getByText(
        /Some changes were saved. The remaining changes/,
      ),
    ).toBeVisible()
  },
}

export const MobileCreateDoctor: Story = {
  args: {
    initialDoctor: undefined,
    onSave: async (draft) => ({
      draft,
      failedSteps: [],
      status: "saved",
    }),
  },
  globals: { viewport: { value: "mobile390Tall" } },
}

export const DarkModeEditDoctor: Story = {
  globals: { theme: "dark" },
}

export const UnsavedCloseConfirmation: Story = {
  args: {
    initialDoctor: undefined,
    onSave: async (draft) => ({
      draft: createDoctorProfileDraft(),
      failedSteps: [],
      status: "saved",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const dialog = canvas.getByRole("dialog", { name: "Add doctor" })
    await userEvent.type(within(dialog).getByRole("textbox", { name: "First name" }), "Lea")
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await expect(within(dialog).getByText("Discard the unsaved changes?")).toBeVisible()
  },
}
