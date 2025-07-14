import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

interface StandardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "title" | "card" | "avatar" | "button"
}

const StandardSkeleton = React.forwardRef<HTMLDivElement, StandardSkeletonProps>(
  ({ className, variant = "text", ...props }, ref) => {
    const variantClasses = {
      text: "h-4 w-full",
      title: "h-6 w-3/4", 
      card: "h-32 w-full",
      avatar: "h-10 w-10 rounded-full",
      button: "h-10 w-24"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "bg-muted animate-pulse rounded",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
StandardSkeleton.displayName = "StandardSkeleton"

export { StandardSkeleton }