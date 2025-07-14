// Standard Design System Components
// ALWAYS use these instead of raw HTML elements

// Layout Components
export { PageLayout } from "./page-layout"
export { 
  PageCard, 
  PageCardHeader, 
  PageCardTitle, 
  PageCardDescription, 
  PageCardContent, 
  PageCardFooter 
} from "./page-card"
export { 
  StandardTabs, 
  StandardTabsList, 
  StandardTabsTrigger, 
  StandardTabsContent 
} from "./standard-tabs"

// Form Components
export { StandardInput } from "./standard-input"
export { StandardTextarea } from "./standard-textarea"
export { StandardSelect, StandardSelectItem } from "./standard-select"

// Typography Components
export { StandardHeading } from "./standard-heading"
export { StandardText } from "./standard-text"
export { StandardLink, StandardExternalLink } from "./standard-link"

// UI Elements
export { StandardBadge } from "./standard-badge"
export { 
  StandardAlert, 
  StandardAlertTitle, 
  StandardAlertDescription 
} from "./standard-alert"
export { StandardSeparator } from "./standard-separator"
export { StandardSkeleton } from "./standard-skeleton"

// Re-export Button (already properly styled)
export { Button } from "./button"

// DEPRECATED - Use Standard components instead
// export { Input } from "./input"           // → Use StandardInput
// export { Textarea } from "./textarea"     // → Use StandardTextarea  
// export { Select } from "./select"         // → Use StandardSelect
// export { Badge } from "./badge"           // → Use StandardBadge
// export { Alert } from "./alert"           // → Use StandardAlert
// export { Separator } from "./separator"   // → Use StandardSeparator