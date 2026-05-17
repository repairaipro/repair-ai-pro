# Quick Component Reference Guide

## 🚀 Most Common Use Cases

### 1. Create a Page with Premium Feel
```tsx
import { PageLayout, PageHeader, ScrollReveal } from '@/components';

export default function MyPage() {
  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title="My Page"
        description="Subheading text"
        action={{ label: "Action", onClick: handleClick }}
      />
      
      <ScrollReveal direction="up">
        <div className="card p-6">Your content</div>
      </ScrollReveal>
    </PageLayout>
  );
}
```

### 2. Create an Animated List
```tsx
import { StaggerContainer, StaggerItem } from '@/components';

<StaggerContainer staggerDelay={0.1}>
  <div className="grid grid-cols-3 gap-4">
    {items.map((item, i) => (
      <StaggerItem key={i}>
        <Card>{item.name}</Card>
      </StaggerItem>
    ))}
  </div>
</StaggerContainer>
```

### 3. Add Scroll-Triggered Animation
```tsx
import { ScrollReveal } from '@/components';

<ScrollReveal direction="up" delay={0.2}>
  <h2>This reveals when scrolled into view</h2>
</ScrollReveal>
```

### 4. Create an Animated Form
```tsx
import { AnimatedFormInput, AnimatedButton, useToast } from '@/components';

export default function MyForm() {
  const [name, setName] = useState('');
  const { success, error } = useToast();

  const handleSubmit = async () => {
    try {
      await submitForm({ name });
      success('Submitted successfully!');
    } catch (err) {
      error('Something went wrong');
    }
  };

  return (
    <>
      <AnimatedFormInput
        label="Name"
        placeholder="Your name"
        value={name}
        onChange={setName}
      />
      <AnimatedButton onClick={handleSubmit}>Submit</AnimatedButton>
    </>
  );
}
```

### 5. Show Success State
```tsx
import { AnimatedCelebration } from '@/components';

<AnimatedCelebration
  title="Success!"
  message="Your job has been created"
  action={{ label: "View Job", onClick: handleClick }}
/>
```

### 6. Add Toast Notifications
```tsx
import { useToast, AnimatedToastContainer } from '@/components';

function MyComponent() {
  const { toasts, removeToast, success, error, info, warning } = useToast();

  return (
    <>
      <button onClick={() => success('Saved!')}>Save</button>
      <button onClick={() => error('Failed')}>Error</button>
      <AnimatedToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
```

### 7. Create Modal Dialog
```tsx
import { AnimatedModal, AnimatedButton } from '@/components';
import { useState } from 'react';

export default function Component() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AnimatedButton onClick={() => setIsOpen(true)}>
        Open Modal
      </AnimatedButton>

      <AnimatedModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
        size="md"
      >
        <p>Are you sure you want to continue?</p>
        <div className="flex gap-3 mt-6">
          <AnimatedButton onClick={() => setIsOpen(false)}>Cancel</AnimatedButton>
          <AnimatedButton variant="primary">Confirm</AnimatedButton>
        </div>
      </AnimatedModal>
    </>
  );
}
```

### 8. Use Animated Tabs
```tsx
import { AnimatedTabs } from '@/components';
import { Settings, BarChart, User } from 'lucide-react';

<AnimatedTabs
  defaultValue="dashboard"
  variant="pill"
  tabs={[
    {
      label: "Dashboard",
      value: "dashboard",
      icon: <BarChart className="w-4 h-4" />,
      content: <DashboardTab />
    },
    {
      label: "Profile",
      value: "profile",
      icon: <User className="w-4 h-4" />,
      content: <ProfileTab />
    },
    {
      label: "Settings",
      value: "settings",
      icon: <Settings className="w-4 h-4" />,
      content: <SettingsTab />
    }
  ]}
/>
```

### 9. Show Loading State
```tsx
import { GridSkeletonLoader, ListSkeletonLoader } from '@/components';

{loading ? (
  <GridSkeletonLoader count={6} />
) : (
  // Your grid content
)}

// Or for lists
{loading ? (
  <ListSkeletonLoader count={3} />
) : (
  // Your list content
)}
```

### 10. Animated Statistics
```tsx
import { AnimatedStats } from '@/components';

<AnimatedStats
  stats={[
    { value: 1200, label: "Users", suffix: "+" },
    { value: 340, label: "Jobs", suffix: "+" },
    { value: 4.9, label: "Rating", suffix: "★" },
    { value: 45, label: "Minutes", suffix: "avg" },
  ]}
/>
```

---

## 🎯 Component Props Reference

### AnimatedButton
```tsx
<AnimatedButton
  variant="primary" | "secondary" | "ghost"
  size="sm" | "md" | "lg"
  onClick={handleClick}
>
  Label
</AnimatedButton>
```

### AnimatedFormInput
```tsx
<AnimatedFormInput
  label="Field Label"
  placeholder="Enter text..."
  value={value}
  onChange={setValue}
  type="text" | "email" | "password"
  icon={<Icon />}
  error={errorMessage}
  disabled={false}
/>
```

### ScrollReveal
```tsx
<ScrollReveal
  direction="up" | "down" | "left" | "right"
  delay={0.1}
  duration={0.8}
  once={true}
>
  Content
</ScrollReveal>
```

### AnimatedModal
```tsx
<AnimatedModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  size="sm" | "md" | "lg" | "xl"
  closeButton={true}
>
  Content
</AnimatedModal>
```

### AnimatedTabs
```tsx
<AnimatedTabs
  defaultValue="tab1"
  variant="default" | "pill" | "underline"
  onChange={handleChange}
  tabs={[
    {
      label: "Tab 1",
      value: "tab1",
      icon: <Icon />,
      content: <Component />
    }
  ]}
/>
```

---

## 🎨 Animation Patterns

### Stagger a Grid of Items
```tsx
import { StaggerContainer, StaggerItem } from '@/components';

<StaggerContainer staggerDelay={0.05}>
  <div className="grid grid-cols-3 gap-4">
    {items.map((item, i) => (
      <StaggerItem key={i}>
        <Card>{item}</Card>
      </StaggerItem>
    ))}
  </div>
</StaggerContainer>
```

### Scroll-Triggered Section
```tsx
import { ScrollReveal } from '@/components';

<ScrollReveal direction="up" delay={0.2}>
  <section className="py-24">
    <h2>Reveals when scrolled</h2>
  </section>
</ScrollReveal>
```

### Animated Headlines
```tsx
import { AnimatedHeadline, AnimatedSubheadline } from '@/components';

<AnimatedHeadline as="h1" className="text-5xl font-bold">
  Word by word reveal
</AnimatedHeadline>

<AnimatedSubheadline delay={0.3}>
  This fades in with a delay
</AnimatedSubheadline>
```

---

## 🔧 Common Customization

### Change Button Colors
```tsx
// Use Tailwind classes
<AnimatedButton className="bg-gradient-to-r from-blue-500 to-purple-500">
  Custom Color
</AnimatedButton>
```

### Adjust Animation Speed
```tsx
<ScrollReveal duration={1.2}>
  {/* Slower animation (default is 0.8) */}
</ScrollReveal>
```

### Multiple Toast Notifications
```tsx
const { success, error } = useToast();

// Can queue multiple
success('First message');
setTimeout(() => error('Second message'), 500);
// They stack automatically
```

---

## 📱 Responsive Tips

All components are responsive by default, but you can adjust:

```tsx
// Grid that changes columns on mobile
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items automatically adjust */}
</div>

// Text that sizes down on mobile
<h1 className="text-3xl md:text-5xl font-bold">
  Responsive Headline
</h1>
```

---

## 🐛 Debugging

### Check if Component Imported Correctly
```tsx
import { AnimatedButton } from '@/components';
// ✅ Correct: from @/components

// ❌ Wrong: from './AnimatedButton'
```

### Toast Not Showing?
```tsx
// Make sure to add container to your layout
<AnimatedToastContainer toasts={toasts} onRemove={removeToast} />
```

### Animation Not Triggering?
```tsx
// Make sure whileInView has proper viewport
<ScrollReveal>
  {/* Ensure parent has min-height or enough content below */}
</ScrollReveal>
```

---

## 🎯 Performance Tips

1. **Use `once={true}`** on ScrollReveal for one-time animations
2. **Limit stagger items** to < 20 items for smooth performance
3. **Lazy load** heavy images in cards
4. **Avoid** nested StaggerContainers
5. **Test on mobile** - animations should be 60fps

---

## 📚 Full Documentation

For detailed component documentation, see:
- `UI_COMPONENTS_GUIDE.md` - Complete component reference
- `/showcase` - Interactive component demo
- `UI_POLISH_SUMMARY.md` - Overview of all enhancements

---

*This quick reference covers the most common use cases. For advanced customization, refer to the full component guide.*
