import * as React from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

interface StandardTabsProps extends React.ComponentProps<typeof Tabs> {
  children: React.ReactNode
}

const StandardTabs = React.forwardRef<
  React.ElementRef<typeof Tabs>,
  StandardTabsProps
>(({ className, ...props }, ref) => (
  <Tabs ref={ref} className={className} {...props} />
))
StandardTabs.displayName = "StandardTabs"

const StandardTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn("bg-slate-800/90 border border-slate-700", className)}
    {...props}
  />
))
StandardTabsList.displayName = "StandardTabsList"

const StandardTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ className, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      "data-[state=active]:bg-slate-700 data-[state=active]:text-white",
      className
    )}
    {...props}
  />
))
StandardTabsTrigger.displayName = "StandardTabsTrigger"

const StandardTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsContent>,
  React.ComponentPropsWithoutRef<typeof TabsContent>
>(({ className, ...props }, ref) => (
  <TabsContent ref={ref} className={className} {...props} />
))
StandardTabsContent.displayName = "StandardTabsContent"

export { 
  StandardTabs, 
  StandardTabsList, 
  StandardTabsTrigger, 
  StandardTabsContent 
}