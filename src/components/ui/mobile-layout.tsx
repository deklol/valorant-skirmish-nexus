import * as React from "react"
import { cn } from "@/lib/utils"

interface MobileLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  headerClassName?: string
  contentClassName?: string
}

const MobileLayout = React.forwardRef<HTMLDivElement, MobileLayoutProps>(
  ({ className, headerClassName, contentClassName, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
MobileLayout.displayName = "MobileLayout"

const MobileContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "container mx-auto px-4 py-4 sm:py-6 lg:py-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
MobileContainer.displayName = "MobileContainer"

const MobileHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
MobileHeader.displayName = "MobileHeader"

const MobileGrid = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
MobileGrid.displayName = "MobileGrid"

const MobileCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-xl p-4 sm:p-6 transition-all duration-200 hover:bg-slate-800 hover:shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
MobileCard.displayName = "MobileCard"

export { MobileLayout, MobileContainer, MobileHeader, MobileGrid, MobileCard }