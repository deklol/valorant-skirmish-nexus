import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { Link } from "react-router-dom"

const linkVariants = cva(
  "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "text-primary hover:text-primary/80 underline-offset-4 hover:underline",
        subtle: "text-muted-foreground hover:text-foreground",
        nav: "text-foreground hover:text-primary font-medium",
        button: "text-primary-foreground bg-primary hover:bg-primary/90 px-4 py-2 rounded-md font-medium"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

interface StandardLinkProps 
  extends React.ComponentProps<typeof Link>,
    VariantProps<typeof linkVariants> {}

const StandardLink = React.forwardRef<
  React.ElementRef<typeof Link>,
  StandardLinkProps
>(({ className, variant, ...props }, ref) => (
  <Link
    ref={ref}
    className={cn(linkVariants({ variant }), className)}
    {...props}
  />
))
StandardLink.displayName = "StandardLink"

interface StandardExternalLinkProps 
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {}

const StandardExternalLink = React.forwardRef<HTMLAnchorElement, StandardExternalLinkProps>(
  ({ className, variant, ...props }, ref) => (
    <a
      ref={ref}
      className={cn(linkVariants({ variant }), className)}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  )
)
StandardExternalLink.displayName = "StandardExternalLink"

export { StandardLink, StandardExternalLink, linkVariants }