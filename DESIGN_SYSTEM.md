# Design System Guidelines

## Overview
This document defines the consistent design patterns for the tournament platform to ensure UI consistency across all components.

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

## Future Development

When adding new components or pages:

1. Always start with the gradient background for pages
2. Use the standard card styling for main containers
3. Follow the tab pattern for any tabbed interfaces
4. Test in both light/dark modes if applicable
5. Refer to this document and existing implementations

This ensures the application maintains a cohesive, professional appearance that users can navigate intuitively.