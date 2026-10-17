"use client"

import { DoctorDirectory } from "./components/organisms/DoctorDirectory"

export function ClinicDoctorsWorkspace(props: Parameters<typeof DoctorDirectory>[0]) {
  return <DoctorDirectory {...props} />
}
