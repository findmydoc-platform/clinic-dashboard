import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { ReviewListFilters, ReviewTreatmentOption } from "../../model/review-source"

type Props = Readonly<{
  filters: ReviewListFilters
  isDirty: boolean
  isMobileOpen: boolean
  onApply: () => void
  onChange: (filters: ReviewListFilters) => void
  onMobileOpenChange: (open: boolean) => void
  treatmentOptions: readonly ReviewTreatmentOption[]
}>

export function ReviewFilters({
  filters,
  isDirty,
  isMobileOpen,
  onApply,
  onChange,
  onMobileOpenChange,
  treatmentOptions,
}: Props) {
  return (
    <section aria-label="Review filters">
      <Button
        aria-expanded={isMobileOpen}
        className="w-full sm:hidden"
        onClick={() => onMobileOpenChange(!isMobileOpen)}
        variant="outline"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        {isMobileOpen ? "Hide filters" : "Show filters"}
      </Button>
      <Card
        className={cn(
          "mt-3 gap-3 p-4 sm:mt-0 sm:grid sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]",
          isMobileOpen ? "grid" : "hidden",
        )}
      >
        <Field label="Period">
          {(props) => (
            <Select
              {...props}
              onValueChange={(period) =>
                onChange({ ...filters, period: period as ReviewListFilters["period"] })
              }
              value={filters.period}
            >
              <option value="all">All periods</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
          )}
        </Field>
        <Field label="Rating">
          {(props) => (
            <Select
              {...props}
              onValueChange={(rating) =>
                onChange({ ...filters, rating: rating as ReviewListFilters["rating"] })
              }
              value={filters.rating}
            >
              <option value="all">All ratings</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} stars
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Treatment">
          {(props) => (
            <Select
              {...props}
              onValueChange={(treatment) => onChange({ ...filters, treatment })}
              value={filters.treatment}
            >
              <option value="all">All treatments</option>
              {treatmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Visibility">
          {(props) => (
            <Select
              {...props}
              onValueChange={(visibility) =>
                onChange({ ...filters, visibility: visibility as ReviewListFilters["visibility"] })
              }
              value={filters.visibility}
            >
              <option value="all">All visibility</option>
              <option value="published">Published</option>
              <option value="moderated">Moderated</option>
              <option value="removed">Removed</option>
              <option value="withdrawn">Withdrawn</option>
            </Select>
          )}
        </Field>
        <div className="flex items-end">
          <Button className="w-full" disabled={!isDirty} onClick={onApply}>
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Apply
          </Button>
        </div>
      </Card>
    </section>
  )
}
