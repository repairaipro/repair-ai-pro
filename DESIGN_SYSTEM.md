# REPAIR OS - Design System & Premium UI

> Enterprise-grade design system for Repair AI Pro. Built for scale, future-proof, and absolutely beautiful.

---

## 📋 Table of Contents

1. [What's New](#whats-new)
2. [Component Library](#component-library)
3. [Design Tokens](#design-tokens)
4. [Premium Pages](#premium-pages)
5. [How to Use](#how-to-use)
6. [Future Features](#future-features)

---

## 🎯 What's New

### Phase 1 Complete (This Update)

✅ **Complete Design System**
- Color palette with light/dark mode support
- Typography system (6 sizes + weights)
- Spacing system (8px grid)
- Shadow system
- Border radius scale
- Animation timing

✅ **Premium Component Library**
- Button (5 variants, 4 sizes, loading states)
- Card (with header, title, description, content, footer)
- Input (with labels, errors, help text)
- Textarea (with char count, labels, errors)
- Badge (4 variants)
- Rating (interactive or view-only)

✅ **Premium Pages**
- Contractor Profile (Stripe/Yelp quality)
- Chat Interface (Facebook Messenger style)
- Job Creation Flow (Progressive disclosure, Resy-style)

✅ **Features Built-In**
- Dark mode support (automatic with `dark:` classes)
- Accessibility (keyboard nav, screen reader support, ARIA labels)
- Responsive design (mobile-first)
- Smooth animations (Framer Motion ready)
- Micro-interactions (hover, active, focus states)

---

## 🧩 Component Library

### Button

```tsx
import { Button } from '@/components/ui/Button'

// Variants: primary, secondary, success, error, outline, ghost
// Sizes: sm, md, lg, xl
// Props: variant, size, fullWidth, isLoading, disabled

<Button variant="primary" size="lg" fullWidth>
  Click me
</Button>

<Button variant="success" isLoading>
  Saving...
</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'

<Card>
  <CardHeader>
    <CardTitle>Your Title</CardTitle>
    <CardDescription>Your description</CardDescription>
  </CardHeader>
  <CardContent>
    Your content
  </CardContent>
  <CardFooter>
    Actions
  </CardFooter>
</Card>
```

### Input

```tsx
import { Input } from '@/components/ui/Input'

<Input
  label="Your email"
  placeholder="you@example.com"
  error="Email is required"
  helpText="We'll never share your email"
/>
```

### Textarea

```tsx
import { Textarea } from '@/components/ui/Textarea'

<Textarea
  label="Description"
  maxLength={500}
  showCharCount
  helpText="Describe your issue in detail"
/>
```

### Badge

```tsx
import { Badge } from '@/components/ui/Badge'

// Variants: primary, success, warning, error, neutral

<Badge variant="success">✓ Verified</Badge>
```

### Rating

```tsx
import { Rating } from '@/components/ui/Rating'

// View-only
<Rating value={4.8} count={47} size="md" />

// Interactive
<Rating 
  value={rating}
  interactive
  onChange={setRating}
  size="lg"
/>
```

### Chat Message

```tsx
import { ChatMessagePremium } from '@/components/ChatMessagePremium'

<ChatMessagePremium
  content="Your message here"
  photoUrl="https://..."
  senderName="John"
  senderPhoto="https://..."
  senderType="contractor"
  isOwn={false}
  timestamp={new Date()}
  status="read"
/>
```

### Contractor Card

```tsx
import { ContractorCardPremium } from '@/components/ContractorCardPremium'

<ContractorCardPremium
  contractor={contractorData}
  variant="standard" // or "compact"
  aiMatch={94}
  aiExplanation="Great match for HVAC repairs"
  financingAvailable={true}
  onViewProfile={() => {}}
  onAccept={() => {}}
/>
```

---

## 🎨 Design Tokens

### Colors

**Primary (Trust & Action)**
- primary-50 through primary-950
- Base: `#6366F1` (Indigo - trustworthy, like Facebook)

**Success (Completion & Approval)**
- success-50 through success-900
- Base: `#22C55E` (Green - positive action)

**Warning (Attention & Pending)**
- warning-50 through warning-900
- Base: `#F59E0B` (Amber - attention)

**Error (Decline & Critical)**
- error-50 through error-900
- Base: `#EF4444` (Red - critical)

**Neutral (Secondary & Disabled)**
- neutral-50 through neutral-950
- Base: `#71717A` (Gray)

### Typography

- **Display**: 32px, bold (page titles)
- **Title**: 24px, semi-bold (section titles)
- **Headline**: 20px, semi-bold (card titles)
- **Body**: 16px, regular (main text)
- **Body Small**: 14px, regular (secondary)
- **Caption**: 12px, semi-bold (metadata)

### Spacing (8px grid)

```
0px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px
```

### Shadows

```
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 4px 6px rgba(0,0,0,0.1)
lg: 0 10px 15px rgba(0,0,0,0.1)
xl: 0 20px 25px rgba(0,0,0,0.1)
2xl: 0 25px 50px rgba(0,0,0,0.25)
```

### Border Radius

```
xs: 4px (small elements)
sm: 8px (inputs, cards)
md: 12px (larger cards)
lg: 16px (modals, sections)
full: 9999px (pills, circles)
```

### Animations

```
fast: 100ms ease-in-out
normal: 150ms ease-in-out (default)
slow: 200ms ease-in-out
slower: 300ms ease-in-out
```

---

## 📄 Premium Pages

### 1. Contractor Profile (`/contractor-profile-premium`)

**Features:**
- Hero photo with gradient overlay
- Profile card that overlaps hero
- Trust signals (verified badge, ratings, stats)
- Service categories with icons
- Recent reviews with photos
- Work photo gallery
- Pricing information
- Why choose this contractor section
- Payment protection badge
- Mobile-responsive design

**What makes it premium:**
- Uses all color variants
- Smooth micro-interactions
- Progressive disclosure (important info first)
- Trust-building visual hierarchy
- Photo lightbox modal

### 2. Chat Interface (`/chat-premium`)

**Features:**
- Online status indicator (green dot)
- Job info card in header
- Message bubbles (Messenger-style)
- Photo attachments with preview
- Read receipts (check marks)
- Typing indicator
- Message timestamps
- Input with attachment + emoji buttons
- Payment protection badge

**What makes it premium:**
- Smooth message animations
- Clear read status
- Professional typography
- Perfect mobile UX
- Accessibility-focused

### 3. Job Creation Flow (`/jobs/create-premium`)

**Features:**
- 5-step progressive disclosure
- Service type selection (emoji icons)
- Photo upload with drag-drop
- Description textarea with char count
- Date + time picker
- Address selection
- Summary card before posting
- Visual progress indicator (steps 1-5)
- Back buttons for easy navigation

**What makes it premium:**
- One question per screen (not overwhelming)
- Friendly emoji icons
- Pro tips to improve adoption
- Clear visual progress
- Easy error handling
- Confirmation before posting

---

## 📖 How to Use

### Installation

```bash
# Install dependencies
npm install

# The dependencies already include:
# - tailwindcss (styling)
# - date-fns (date formatting)
# - lucide-react (icons)
# - class-variance-authority (component variants)
# - clsx (conditional classnames)
```

### Create a New Page

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function MyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Hello World</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Start typing..." />
          <Button className="mt-4">Submit</Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Theming

Dark mode automatically works with Tailwind's `dark:` prefix:

```tsx
<div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
  Automatically switches on system preference
</div>
```

### Adding Animations

```tsx
import { motion } from 'framer-motion'

<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.15 }}
>
  Animated button
</motion.button>
```

---

## 🚀 Future Features (Architected In)

### Month 3 (Financing & Insurance)

```tsx
// Financing badges
<Badge variant="primary">💳 Financing Available</Badge>

// Insurance integration display
financingAvailable={true}
insurancePartner="State Farm"
```

### Month 6 (AI Features)

```tsx
// AI match percentage
<ContractorCardPremium
  aiMatch={94}
  aiExplanation="Great match for your HVAC issue"
  predictedCost="$1,200-1,500"
/>
```

### Year 2 (Voice & Advanced Features)

```tsx
// Voice chat support
// Real-time GPS tracking
// Smart notifications
// Dispute escalation
// Advanced analytics
```

---

## 🎯 Testing Your Design System

Visit these demo pages:

1. **Contractor Profile**
   - URL: `/contractor-profile-premium`
   - Tests: Card layouts, ratings, badges, buttons

2. **Chat Interface**
   - URL: `/chat-premium`
   - Tests: Message rendering, photo display, input

3. **Job Creation**
   - URL: `/jobs/create-premium`
   - Tests: Form inputs, button states, progress indicator

---

## 📱 Responsive Breakpoints

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

All components are mobile-first and tested on:
- ✓ iPhone 12 (375px)
- ✓ Tablet (768px)
- ✓ Desktop (1280px+)

---

## ♿ Accessibility

All components include:
- ✓ Keyboard navigation (Tab, Enter, Escape)
- ✓ Screen reader support (ARIA labels)
- ✓ Focus states (ring-2 ring-primary-500)
- ✓ Color contrast (4.5:1 minimum)
- ✓ Form label associations
- ✓ Error announcements

Test with:
- Screen readers (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation
- Zoom to 200%
- Color blindness simulators

---

## 🔧 Customization

### Change Primary Color

In `tailwind.config.js`:

```js
primary: {
  600: '#YOUR_COLOR_HERE'
}
```

All components will update automatically.

### Add New Variant

Edit component file:

```tsx
const buttonVariants = cva(
  'base-styles',
  {
    variants: {
      variant: {
        // Add your variant here
        newVariant: 'bg-custom text-custom'
      }
    }
  }
)
```

---

## 📚 Resources

- Tailwind CSS: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- CVA (Class Variance Authority): https://cva.style
- Date-fns: https://date-fns.org
- Framer Motion: https://www.framer.com/motion

---

## 🚦 Next Steps

1. **Test all pages** in your browser
2. **Install dependencies**: `npm install`
3. **Customize colors** to your brand
4. **Replace demo data** with real data
5. **Add more pages** using this design system
6. **Deploy to Vercel**

---

**Built with ❤️ for Repair AI Pro**

This design system is future-proof, scalable, and ready for a billion-dollar company.
