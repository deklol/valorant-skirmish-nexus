# Design System Guidelines

## Overview
This document defines the consistent design patterns for the tournament platform to ensure UI consistency across all components.

## Reusable Layout Components

To prevent UI inconsistencies, use these pre-built components instead of manually applying styles:

### PageLayout Component
Automatically applies the gradient background and container styling:

```tsx
import { PageLayout } from "@/components/ui/page-layout"

export default function MyPage() {
  return (
    <PageLayout>
      {/* Your page content */}
    </PageLayout>
  )
}
```

### PageCard Component
Pre-styled card with consistent background and borders:

```tsx
import { 
  PageCard, 
  PageCardHeader, 
  PageCardTitle, 
  PageCardDescription,
  PageCardContent 
} from "@/components/ui/page-card"

export default function MyComponent() {
  return (
    <PageCard>
      <PageCardHeader>
        <PageCardTitle>Card Title</PageCardTitle>
        <PageCardDescription>Card description</PageCardDescription>
      </PageCardHeader>
      <PageCardContent>
        {/* Content */}
      </PageCardContent>
    </PageCard>
  )
}
```

### StandardTabs Component
Pre-configured tabs with consistent styling:

```tsx
import { 
  StandardTabs, 
  StandardTabsList, 
  StandardTabsTrigger, 
  StandardTabsContent 
} from "@/components/ui/standard-tabs"

export default function MyTabs() {
  return (
    <StandardTabs defaultValue="tab1">
      <StandardTabsList>
        <StandardTabsTrigger value="tab1">Tab 1</StandardTabsTrigger>
        <StandardTabsTrigger value="tab2">Tab 2</StandardTabsTrigger>
      </StandardTabsList>
      <StandardTabsContent value="tab1">
        Tab 1 content
      </StandardTabsContent>
      <StandardTabsContent value="tab2">
        Tab 2 content
      </StandardTabsContent>
    </StandardTabs>
  )
}
```

## Usage Guidelines

### For New Pages/Components
1. **Always use `PageLayout`** for page-level components
2. **Always use `PageCard`** instead of raw `Card` components
3. **Always use `StandardTabs`** for tabbed interfaces
4. **Test in both light/dark modes** if applicable

### For Existing Pages (Migration Strategy)
1. Gradually replace `Card` with `PageCard`
2. Replace `Tabs` implementations with `StandardTabs`
3. Wrap page content with `PageLayout`
4. Remove manual background and styling classes

## Color Palette & Backgrounds

### Main Application Background
```css
bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900
```

### Card Components
```css
bg-slate-800/90 border-slate-700
```

### Tab Components

#### TabsList
```css
bg-slate-800/90 border border-slate-700
```

#### TabsTrigger (Active State)
```css
data-[state=active]:bg-slate-700 data-[state=active]:text-white
```

### Component Hierarchy

1. **Page Background**: Always use the gradient background
2. **Main Cards**: `bg-slate-800/90 border-slate-700`
3. **Nested Cards**: `bg-slate-900 border-slate-700` 
4. **Interactive Elements**: Follow the tab pattern for consistency

### Examples of Correct Implementation

#### Page Structure
```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
  <div className="container mx-auto px-4 py-8">
    <Card className="bg-slate-800/90 border-slate-700">
      <!-- Content -->
    </Card>
  </div>
</div>
```

#### Tab Implementation
```tsx
<Tabs defaultValue="overview">
  <TabsList className="bg-slate-800/90 border border-slate-700">
    <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
      Overview
    </TabsTrigger>
    <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
      Settings
    </TabsTrigger>
  </TabsList>
</Tabs>
```

## Files Updated for Consistency

### Primary Pages
- ✅ src/pages/Admin.tsx
- ✅ src/pages/Profile.tsx
- ✅ src/pages/Statistics.tsx
- ✅ src/pages/Help.tsx
- ✅ src/pages/Leaderboard.tsx (Reference standard)
- ✅ src/pages/NotFound.tsx
- ✅ src/pages/PublicProfile.tsx
- ✅ src/pages/Index.tsx
- ✅ src/pages/Login.tsx
- ✅ src/pages/Tournaments.tsx
- ✅ src/pages/TournamentDetail.tsx
- ✅ src/pages/Archive.tsx
- ✅ src/pages/Bracket.tsx
- ✅ src/pages/BracketView.tsx
- ✅ src/pages/MatchDetails.tsx
- ✅ src/pages/Players.tsx
- ✅ src/components/TeamManagementPage.tsx
- ✅ src/components/TeamProfile.tsx
- ✅ src/components/TeamsDirectory.tsx

### Components
- ✅ src/components/MatchManager.tsx
- ✅ src/components/TournamentTabs.tsx
- ✅ src/components/TournamentMedicEditModal.tsx
- ✅ src/components/match-details/MatchTabs.tsx
- ✅ src/components/medic-enhanced/AdvancedMonitoringSystem.tsx
- ✅ src/components/tournament-detail/TournamentTabs.tsx

## Design Principles

1. **Consistency First**: All tabs should use the same background and active state styling
2. **Semantic Colors**: Use the established color scheme from tailwind.config.ts and index.css
3. **Visual Hierarchy**: Maintain clear distinction between component levels
4. **Accessibility**: Ensure proper contrast ratios for all text and interactive elements

## Enforcement Rules

### MANDATORY for New Development
- **NEVER** manually apply gradient backgrounds - use `PageLayout`
- **NEVER** manually style cards - use `PageCard`
- **NEVER** manually style tabs - use `StandardTabs`
- **ALWAYS** import and use the standard components

### Benefits
1. **Zero Configuration** - Components work perfectly out of the box
2. **Automatic Consistency** - Impossible to create inconsistent UIs
3. **Future-Proof** - Design changes happen in one place
4. **Developer Friendly** - Less code, fewer classes to remember

### Migration Path
Existing pages can be gradually migrated by replacing:
- `<Card>` → `<PageCard>`
- `<Tabs>` → `<StandardTabs>`
- Manual backgrounds → `<PageLayout>`

This ensures the application maintains a cohesive, professional appearance automatically.