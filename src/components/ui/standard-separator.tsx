import * as React from "react"
import { cn } from "@/lib/utils"
import { Separator } from "./separator"

interface StandardSeparatorProps extends React.ComponentProps<typeof Separator> {}

const StandardSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  StandardSeparatorProps
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    className={cn("bg-border", className)}
    {...props}
  />
))
StandardSeparator.displayName = "StandardSeparator"

export { StandardSeparator }