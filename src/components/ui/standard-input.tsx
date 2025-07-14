import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

interface StandardInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const StandardInput = React.forwardRef<HTMLInputElement, StandardInputProps>(
  ({ className, ...props }, ref) => (
    <Input
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
StandardInput.displayName = "StandardInput"

export { StandardInput }