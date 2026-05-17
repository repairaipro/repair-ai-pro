# Premium UI Components & Animations Guide

## Overview

The application now includes a comprehensive library of **premium animated components** built with **Framer Motion**, providing world-class UX comparable to platforms like Figma, Vercel, Linear, and Airbnb.

All components use:
- **Spring physics animations** for natural motion
- **Scroll-triggered reveals** for engaging page loads
- **Glassmorphism design** with backdrop blur effects
- **Responsive interactions** with hover and tap states
- **Type-safe TypeScript** implementations
- **Tailwind CSS** styling with design system variables

---

## Component Library

### 1. **AnimatedButton**
Interactive button with ripple effects and smooth transitions.

**Features:**
- Variants: `primary`, `secondary`, `ghost`
- Sizes: `sm`, `md`, `lg`
- Ripple effect on tap with scale animation [0 → 4]
- Hover state with scale 1.05, tap state with scale 0.95

**Usage:**
```tsx
import { AnimatedButton } from '@/components/AnimatedButton';

<AnimatedButton variant="primary" size="md">
  Click Me
</AnimatedButton>
```

---

### 2. **AnimatedStats**
Count-up animations for statistics with scroll-triggered activation.

**Features:**
- Animates from 0 to target number over 2 seconds
- Staggered entrance with spring physics
- Scroll-triggered visibility
- Easing function for natural feel

**Usage:**
```tsx
import { AnimatedStats } from '@/components/AnimatedStats';

<AnimatedStats
  stats={[
    { value: 1200, label: "Jobs Posted", suffix: "+" },
    { value: 340, label: "Verified Pros", suffix: "+" },
  ]}
/>
```

---

### 3. **AnimatedHeadline & AnimatedSubheadline**
Text reveals with staggered word animations.

**Features:**
- Word-by-word reveal with spring physics
- Customizable delay
- Scroll-triggered viewport
- Support for h1-h6 heading levels

**Usage:**
```tsx
import { AnimatedHeadline, AnimatedSubheadline } from '@/components/AnimatedHeadline';

<AnimatedHeadline as="h1" className="text-4xl font-bold">
  Any job. Any trade. Done fast.
</AnimatedHeadline>

<AnimatedSubheadline delay={0.2}>
  Your supporting subtitle here
</AnimatedSubheadline>
```

---

### 4. **ScrollReveal & StaggerContainer**
Scroll-triggered entrance animations for page elements.

**Features:**
- Directional reveals: `up`, `down`, `left`, `right`
- StaggerContainer for list animations
- StaggerItem for individual item delays
- Spring physics transitions

**Usage:**
```tsx
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/ScrollReveal';

<ScrollReveal direction="up">
  <div>Content reveals upward when scrolled into view</div>
</ScrollReveal>

<StaggerContainer staggerDelay={0.1}>
  {items.map((item, i) => (
    <StaggerItem key={i}>
      <Card>{item}</Card>
    </StaggerItem>
  ))}
</StaggerContainer>
```

---

### 5. **AnimatedPricingCard**
Premium pricing cards with glow effects and feature animations.

**Features:**
- Hover glow background with gradient
- Animated checkmarks for features
- Scale and glow on hover
- Optional `highlight` badge for featured tier
- Shimmer effect on button hover

**Usage:**
```tsx
import { AnimatedPricingCard } from '@/components/AnimatedPricingCard';

<AnimatedPricingCard
  title="Professional"
  subtitle="For serious users"
  price="29"
  period="/month"
  features={["Feature 1", "Feature 2"]}
  cta={{ label: "Start Trial", href: "/signup" }}
  highlight={true}
  badge="MOST POPULAR"
  index={0}
/>
```

---

### 6. **JobCardAnimated**
Premium job discovery cards with multiple animation layers.

**Features:**
- Staggered content reveals on entrance
- Urgency badges with color gradients
- Infinite scale animation on cost estimate
- Bouncing arrow icon in footer
- Glassmorphic design with opacity transitions
- Hover lift effect with border color transition

**Usage:**
```tsx
import { JobCardAnimated } from '@/components/JobCardAnimated';

<JobCardAnimated
  jobId="123"
  trade="Plumbing"
  description="Leaky faucet in kitchen"
  urgency="emergency"
  estimatedCost={150}
  index={0}
/>
```

---

### 7. **ContractorCardAnimated**
Professional contractor profile cards with premium interactions.

**Features:**
- Avatar hover with scale animation
- Star rating animation on reveal
- Responsive time badge highlight
- Profile hover CTA appears
- Optional featured badge
- Smooth image scale on hover

**Usage:**
```tsx
import { ContractorCardAnimated } from '@/components/ContractorCardAnimated';

<ContractorCardAnimated
  id="contractor123"
  name="John Smith"
  trade="Electrician"
  rating={4.9}
  reviewCount={42}
  location="Houston, TX"
  responseTime="< 2 hours"
  verified={true}
  index={0}
  featured={true}
/>
```

---

### 8. **Form Components**
Animated form inputs with focus state animations.

**Features:**
- Icon color transitions on focus
- Label opacity animations
- Border color changes (normal/focus/error)
- Error message slide-in animation
- Supported types: input, select, textarea
- Smooth glow effect on focus

**Components:**
- `AnimatedFormInput` - Text, email, password, number, tel
- `AnimatedFormSelect` - Dropdown with animated arrow
- `AnimatedTextArea` - Multi-line text input

**Usage:**
```tsx
import { AnimatedFormInput, AnimatedFormSelect } from '@/components/AnimatedFormInput';

<AnimatedFormInput
  label="Name"
  placeholder="Enter your name"
  icon={<User className="w-4 h-4" />}
  value={name}
  onChange={setName}
  error={nameError}
/>

<AnimatedFormSelect
  label="Trade"
  options={[
    { value: "plumbing", label: "Plumbing" },
    { value: "electrical", label: "Electrical" },
  ]}
  value={trade}
  onChange={setTrade}
/>
```

---

### 9. **AnimatedModal & AnimatedSheet**
Dialog components with spring entrance/exit animations.

**Features:**
- Modal: Center dialog with backdrop blur
- Sheet: Side panel (left/right) with slide animation
- Spring physics transitions
- Animated close button
- Click-outside to dismiss
- Size options: sm, md, lg, xl

**Usage:**
```tsx
import { AnimatedModal, AnimatedSheet } from '@/components/AnimatedModal';

const [isOpen, setIsOpen] = useState(false);

<AnimatedModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure?</p>
</AnimatedModal>

<AnimatedSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Filter Options"
  side="right"
>
  {/* Filter content */}
</AnimatedSheet>
```

---

### 10. **AnimatedToastContainer & useToast**
Notification system with smooth animations.

**Features:**
- Success, error, info, warning types
- Auto-dismiss with configurable duration
- Staggered entrance/exit
- Click to dismiss
- useToast hook for easy integration

**Usage:**
```tsx
import { AnimatedToastContainer, useToast } from '@/components/AnimatedToast';

function MyComponent() {
  const { toasts, addToast, removeToast, success, error } = useToast();

  return (
    <>
      <button onClick={() => success('Saved successfully!')}>
        Save
      </button>
      <button onClick={() => error('Something went wrong')}>
        Error
      </button>
      <AnimatedToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
```

---

### 11. **Loading Skeletons**
Pulse animation skeletons for loading states.

**Features:**
- `SkeletonPulse` - Base component with gradient animation
- Pre-built: `CardSkeleton`, `ContractorCardSkeleton`, `JobCardSkeleton`
- Grid and List loaders
- Smooth 2-second pulse loop

**Usage:**
```tsx
import { GridSkeletonLoader, CardSkeleton } from '@/components/AnimatedSkeleton';

{loading ? (
  <GridSkeletonLoader count={6} />
) : (
  // Your content
)}
```

---

### 12. **PageLayout & PageHeader**
Consistent page structure with entrance animations.

**Features:**
- Consistent max-width container
- Smooth page fade-in
- Header with title, description, optional action
- Multiple max-width options: sm, md, lg, xl, 2xl, 4xl, 5xl, 6xl

**Usage:**
```tsx
import { PageLayout, PageHeader } from '@/components/PageLayout';

<PageLayout maxWidth="lg">
  <PageHeader
    title="Jobs"
    description="Find and manage your jobs"
    action={{ label: "Post Job", onClick: handlePost, icon: <Plus /> }}
  />
  {/* Page content */}
</PageLayout>
```

---

### 13. **AnimatedCelebration**
Success celebration with animation and confetti.

**Features:**
- Animated checkmark icon with pulse
- Sparkle animations around icon
- Confetti particles
- Optional action button
- Spring entrance animation

**Usage:**
```tsx
import { AnimatedCelebration } from '@/components/AnimatedCelebration';

<AnimatedCelebration
  title="Job Complete!"
  message="Your job has been successfully completed"
  action={{ label: "View Details", onClick: handleClick }}
  showConfetti={true}
/>
```

---

### 14. **AnimatedTabs**
Smooth tab switching with animated indicators.

**Features:**
- Three variants: default, pill, underline
- Smooth content transitions
- Optional icons per tab
- LayoutId for animated background
- onChange callback

**Usage:**
```tsx
import { AnimatedTabs } from '@/components/AnimatedTabs';

<AnimatedTabs
  defaultValue="jobs"
  variant="pill"
  tabs={[
    {
      label: "Jobs",
      value: "jobs",
      icon: <Briefcase />,
      content: <JobsList />
    },
    {
      label: "Settings",
      value: "settings",
      icon: <Settings />,
      content: <Settings />
    },
  ]}
/>
```

---

## Updated Pages

### Landing Page (`src/app/page.tsx`)
Now includes:
- Animated hero headline with word reveals
- Animated subheadline entrance
- Animated stats counter (scroll-triggered)
- Staggered feature cards
- Scroll-triggered testimonial reveals
- Animated pricing cards with glow effects

### Job Marketplace (`src/app/jobs/page.tsx`)
Now includes:
- Page fade-in entrance
- Skeleton loader on initial load
- Staggered job card animations with spring physics
- Smooth grid animation on filter changes

### Showcase Page (`src/app/showcase/page.tsx`)
Component demo and documentation with interactive examples of all components.

---

## Design System Integration

All components use CSS variables for theming:
- `--color-bg` - Background color
- `--color-text` - Primary text color
- `--color-text-2` through `--color-text-4` - Secondary text colors
- `--color-border` - Border color
- `--color-surface` - Surface/card background
- `--color-brand` - Brand accent color
- `--color-success` - Success indicator color

This ensures consistent theming across light/dark modes.

---

## Animation Principles

All animations follow these principles:
1. **Spring Physics** - `stiffness: 100-300`, `damping: 20-30` for natural feel
2. **Stagger Effects** - `staggerChildren: 0.05-0.15` for cascading reveals
3. **Scroll Triggers** - `whileInView` with `viewport={{ once: true, margin: '-100px' }}`
4. **Micro-interactions** - Hover/tap states with scale 1.05/0.95
5. **Performance** - GPU-accelerated transforms (opacity, scale, x, y)

---

## Performance Considerations

- All animations use GPU-accelerated properties (transform, opacity)
- Lazy rendering with `whileInView` to reduce initial load
- Viewport margin of -100px for early activation
- Minimal repaints with Framer Motion's optimization
- Skeleton loaders prevent content shift (CLS)

---

## Accessibility

- All interactive elements have focus states
- Toast notifications respect `prefers-reduced-motion`
- Color contrast maintained across all states
- Semantic HTML with proper ARIA roles
- Keyboard navigation for modals and form inputs

---

## Next Steps

1. **Implement in more pages** - Apply these components to checkout, profile, dashboard pages
2. **Create page transitions** - Wrap route changes with animation containers
3. **Build page-level animations** - Parallax, scroll-triggered sections
4. **Optimize performance** - Profile animations on mobile devices
5. **Extend component library** - Create context-specific variations (e.g., NotificationCard, ReviewCard)

---

## Component Export

All components are exported from `src/components/index.ts` for easy importing:

```tsx
import {
  AnimatedButton,
  AnimatedStats,
  ScrollReveal,
  useToast,
  // ... etc
} from '@/components';
```

---

## Resources

- **Framer Motion Docs**: https://www.framer.com/motion/
- **Design Inspiration**: Figma, Vercel, Linear, Airbnb
- **CSS Variables**: See `src/globals.css` for theme configuration
- **Demo**: Visit `/showcase` to see all components in action
