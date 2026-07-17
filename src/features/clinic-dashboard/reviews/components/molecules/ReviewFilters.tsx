import { RefreshCw, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type {
  ReviewFilters as ReviewFiltersValue,
  ReviewPeriod,
  ReviewRating,
} from "../../model/review-filters"
import { reviewStatuses } from "../../model/review"

type ReviewFiltersProps = Readonly<{
  filters: ReviewFiltersValue
  isDirty: boolean
  isMobileOpen: boolean
  isRefreshing: boolean
  onApply: () => void
  onChange: (filters: ReviewFiltersValue) => void
  onMobileOpenChange: (open: boolean) => void
  onRefresh: () => void
  treatmentOptions: readonly string[]
}>

export function ReviewFilters({
  filters,
  isDirty,
  isMobileOpen,
  isRefreshing,
  onApply,
  onChange,
  onMobileOpenChange,
  onRefresh,
  treatmentOptions,
}: ReviewFiltersProps) {
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
        <Field className="gap-1" label={<span className="text-xs tracking-wide uppercase">Period</span>}>
          {(controlProps) => (
            <Select
              {...controlProps}
              className="text-sm font-normal"
              onValueChange={(value) => onChange({ ...filters, period: value as ReviewPeriod })}
              value={filters.period}
            >
              <option value="all">All periods</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
          )}
        </Field>
        <Field className="gap-1" label={<span className="text-xs tracking-wide uppercase">Rating</span>}>
          {(controlProps) => (
            <Select
              {...controlProps}
              className="text-sm font-normal"
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  rating: value === "all" ? "all" : (Number(value) as ReviewRating),
                })
              }
              value={filters.rating}
            >
              <option value="all">All ratings</option>
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} {rating === 1 ? "star" : "stars"}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field className="gap-1" label={<span className="text-xs tracking-wide uppercase">Treatment</span>}>
          {(controlProps) => (
            <Select
              {...controlProps}
              className="text-sm font-normal"
              onValueChange={(value) => onChange({ ...filters, treatment: value })}
              value={filters.treatment}
            >
              <option value="all">All treatments</option>
              {treatmentOptions.map((treatment) => (
                <option key={treatment} value={treatment}>
                  {treatment}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field className="gap-1" label={<span className="text-xs tracking-wide uppercase">Status</span>}>
          {(controlProps) => (
            <Select
              {...controlProps}
              className="text-sm font-normal"
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  status: value as ReviewFiltersValue["status"],
                })
              }
              value={filters.status}
            >
              <option value="all">All statuses</option>
              {reviewStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex flex-col justify-end gap-1.5">
          <span className="text-xs font-bold text-[var(--foreground)]">
            {isDirty ? "Changes not applied" : "Filters up to date"}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={!isDirty}
              onClick={onApply}
              size="small"
              variant={isDirty ? "primary" : "outline"}
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" /> Apply filters
            </Button>
            <Button
              aria-label={isRefreshing ? "Refreshing reviews" : "Refresh reviews"}
              disabled={isRefreshing}
              onClick={onRefresh}
              size="small"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" className={cn("size-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
