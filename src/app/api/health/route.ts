export function GET() {
  return Response.json({
    readiness: "foundation",
    service: "clinic-dashboard",
    status: "ok",
  })
}
