// Each domain enables this gate only after its target routes and providers are converted.
export const clinicScopeConversions: Readonly<
  Record<
    | "profile"
    | "gallery"
    | "treatments"
    | "doctors"
    | "inquiries"
    | "reviews"
    | "notifications"
    | "reporting",
    boolean
  >
> = {
  profile: false,
  gallery: true,
  treatments: false,
  doctors: false,
  inquiries: true,
  reviews: true,
  notifications: true,
  reporting: true,
}
