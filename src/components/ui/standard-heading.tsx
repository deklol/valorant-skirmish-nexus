import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const headingVariants = cva("text-foreground font-semibold tracking-tight", {
  variants: {
    level: {
      h1: "text-4xl lg:text-5xl",
      h2: "text-3xl lg:text-4xl",
      h3: "text-2xl lg:text-3xl", 
      h4: "text-xl lg:text-2xl",
      h5: "text-lg lg:text-xl",
      h6: "text-base lg:text-lg"
    },
    color: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      destructive: "text-destructive"
    }
  },
  defaultVariants: {
    level: "h2",
    color: "default"
  }
})

interface StandardHeadingProps 
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "color">,
    VariantProps<typeof headingVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
}

const StandardHeading = React.forwardRef<HTMLHeadingElement, StandardHeadingProps>(
  ({ className, level, color, as, ...props }, ref) => {
    const Comp = as || level || "h2"
    return (
      <Comp
        ref={ref}
        className={cn(headingVariants({ level: level || (as as any), color }), className)}
        {...props}
      />
    )
  }
)
StandardHeading.displayName = "StandardHeading"

export { StandardHeading, headingVariants }