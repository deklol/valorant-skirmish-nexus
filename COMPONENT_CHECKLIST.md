# Component Usage Checklist

Before creating any new component or page, use this checklist:

## ✅ Layout
- [ ] **Page wrapper**: Used `PageLayout` instead of manual gradient backgrounds?
- [ ] **Content cards**: Used `PageCard` instead of raw `Card`?
- [ ] **Tabs**: Used `StandardTabs` instead of raw `Tabs`?

## ✅ Forms
- [ ] **Text inputs**: Used `StandardInput` instead of `<input>` or `Input`?
- [ ] **Text areas**: Used `StandardTextarea` instead of `<textarea>` or `Textarea`?
- [ ] **Dropdowns**: Used `StandardSelect` instead of `<select>` or `Select`?

## ✅ Typography
- [ ] **Headings**: Used `StandardHeading` instead of `<h1>`, `<h2>`, etc.?
- [ ] **Body text**: Used `StandardText` instead of `<p>`, `<span>`?
- [ ] **Links**: Used `StandardLink` instead of `<a>` or raw `Link`?

## ✅ UI Elements
- [ ] **Status indicators**: Used `StandardBadge` instead of raw `Badge`?
- [ ] **Notifications**: Used `StandardAlert` instead of raw `Alert`?
- [ ] **Dividers**: Used `StandardSeparator` instead of `<hr>` or raw `Separator`?
- [ ] **Loading states**: Used `StandardSkeleton` for loading placeholders?

## 🚫 Never Use These Directly
- ❌ `<input>`, `<textarea>`, `<select>`
- ❌ `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`
- ❌ `<p>`, `<span>` for content text
- ❌ `<a>` for navigation
- ❌ Manual `bg-gradient-*` backgrounds
- ❌ Manual `bg-slate-800/90 border-slate-700` styling

## ✅ Quick Import Reference
```tsx
import { 
  PageLayout,
  PageCard,
  StandardTabs,
  StandardInput,
  StandardHeading,
  StandardText,
  StandardLink,
  StandardBadge,
  StandardAlert
} from "@/components/ui"
```

## Before Submitting Code
1. **Search for raw HTML elements** in your component
2. **Check for manual styling classes** that could be standardized
3. **Verify imports** are using standard components
4. **Test in both light/dark modes** (automatic with standard components)