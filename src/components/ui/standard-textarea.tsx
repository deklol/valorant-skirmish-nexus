import * as React from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "./textarea"

interface StandardTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const StandardTextarea = React.forwardRef<HTMLTextAreaElement, StandardTextareaProps>(
  ({ className, ...props }, ref) => (
    <Textarea
      ref={ref}
      className={cn(
        "bg-input border-border text-foreground placeholder:text-muted-foreground",
        "focus:ring-ring focus:border-ring",
        className
      )}
      {...props}
    />
  )
)
StandardTextarea.displayName = "StandardTextarea"

export { StandardTextarea }