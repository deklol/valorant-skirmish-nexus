import * as React from "react"
import { cn } from "@/lib/utils"

interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  containerClassName?: string
}

const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  ({ className, containerClassName, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900",
        className
      )}
      {...props}
    >
      <div className={cn("container mx-auto px-4 py-8", containerClassName)}>
        {children}
      </div>
    </div>
  )
)
PageLayout.displayName = "PageLayout"

export { PageLayout }