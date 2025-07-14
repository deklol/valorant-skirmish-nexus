import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { cva, type VariantProps } from "class-variance-authority"

const standardBadgeVariants = cva("", {
  variants: {
    status: {
      success: "bg-green-600 text-green-50 hover:bg-green-600/90",
      warning: "bg-yellow-600 text-yellow-50 hover:bg-yellow-600/90", 
      error: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      info: "bg-blue-600 text-blue-50 hover:bg-blue-600/90",
      neutral: "bg-muted text-muted-foreground hover:bg-muted/90"
    }
  },
  defaultVariants: {
    status: "neutral"
  }
})

interface StandardBadgeProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof standardBadgeVariants> {}

const StandardBadge = React.forwardRef<HTMLDivElement, StandardBadgeProps>(
  ({ className, status, ...props }, ref) => (
    <div ref={ref}>
      <Badge
        className={cn(standardBadgeVariants({ status }), className)}
        {...props}
      />
    </div>
  )
)
StandardBadge.displayName = "StandardBadge"

export { StandardBadge, standardBadgeVariants }