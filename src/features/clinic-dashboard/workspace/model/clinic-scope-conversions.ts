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
  gallery: false,
  treatments: false,
  doctors: false,
  inquiries: true,
  reviews: false,
  notifications: false,
  reporting: true,
}
