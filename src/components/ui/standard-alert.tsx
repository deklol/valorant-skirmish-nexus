import * as React from "react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "./alert"
import { cva, type VariantProps } from "class-variance-authority"

const standardAlertVariants = cva("", {
  variants: {
    status: {
      default: "border-border bg-background text-foreground",
      success: "border-green-600/20 bg-green-600/10 text-green-600",
      warning: "border-yellow-600/20 bg-yellow-600/10 text-yellow-600",
      error: "border-destructive/20 bg-destructive/10 text-destructive",
      info: "border-blue-600/20 bg-blue-600/10 text-blue-600"
    }
  },
  defaultVariants: {
    status: "default"
  }
})

interface StandardAlertProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof standardAlertVariants> {}

const StandardAlert = React.forwardRef<HTMLDivElement, StandardAlertProps>(
  ({ className, status, ...props }, ref) => (
    <Alert
      ref={ref}
      className={cn(standardAlertVariants({ status }), className)}
      {...props}
    />
  )
)
StandardAlert.displayName = "StandardAlert"

const StandardAlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <AlertTitle ref={ref} className={cn("font-semibold", className)} {...props} />
))
StandardAlertTitle.displayName = "StandardAlertTitle"

const StandardAlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <AlertDescription ref={ref} className={cn("text-sm", className)} {...props} />
))
StandardAlertDescription.displayName = "StandardAlertDescription"

export { 
  StandardAlert, 
  StandardAlertTitle, 
  StandardAlertDescription, 
  standardAlertVariants 
}