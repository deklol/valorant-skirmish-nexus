import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const textVariants = cva("", {
  variants: {
    size: {
      xs: "text-xs",
      sm: "text-sm", 
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl"
    },
    color: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      secondary: "text-secondary-foreground",
      destructive: "text-destructive",
      accent: "text-accent-foreground"
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium", 
      semibold: "font-semibold",
      bold: "font-bold"
    }
  },
  defaultVariants: {
    size: "base",
    color: "default",
    weight: "normal"
  }
})

interface StandardTextProps 
  extends Omit<React.HTMLAttributes<HTMLParagraphElement>, "color">,
    VariantProps<typeof textVariants> {
  as?: "p" | "span" | "div" | "label"
}

const StandardText = React.forwardRef<HTMLElement, StandardTextProps>(
  ({ className, size, color, weight, as = "p", ...props }, ref) => {
    const Comp = as as any
    return (
      <Comp
        ref={ref}
        className={cn(textVariants({ size, color, weight }), className)}
        {...props}
      />
    )
  }
)
StandardText.displayName = "StandardText"

export { StandardText, textVariants }