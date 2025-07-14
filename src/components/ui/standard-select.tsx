import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

interface StandardSelectProps extends React.ComponentProps<typeof Select> {
  placeholder?: string
  triggerClassName?: string
}

const StandardSelect = React.forwardRef<
  React.ElementRef<typeof Select>,
  StandardSelectProps
>(({ children, placeholder, triggerClassName, ...props }, ref) => (
  <Select {...props}>
    <SelectTrigger 
      className={cn(
        "bg-input border-border text-foreground",
        "focus:ring-ring focus:border-ring",
        triggerClassName
      )}
    >
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent className="bg-popover border-border">
      {children}
    </SelectContent>
  </Select>
))
StandardSelect.displayName = "StandardSelect"

const StandardSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectItem>,
  React.ComponentPropsWithoutRef<typeof SelectItem>
>(({ className, ...props }, ref) => (
  <SelectItem
    ref={ref}
    className={cn(
      "text-foreground hover:bg-accent hover:text-accent-foreground",
      "focus:bg-accent focus:text-accent-foreground",
      className
    )}
    {...props}
  />
))
StandardSelectItem.displayName = "StandardSelectItem"

export { StandardSelect, StandardSelectItem }