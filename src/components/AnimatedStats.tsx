'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Stat {
  value: number;
  label: string;
  suffix?: string;
}

export function AnimatedStats({ stats }: { stats: Stat[] }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
            delay: i * 0.1,
          }}
        >
          <CountUpNumber
            value={stat.value}
            suffix={stat.suffix || ''}
            isVisible={isVisible}
          />
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CountUpNumber({
  value,
  suffix,
  isVisible,
}: {
  value: number;
  suffix: string;
  isVisible: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for natural feel
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplayValue(Math.floor(value * eased));

      if (progress === 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <div
      className="text-2xl font-bold mb-1"
      style={{
        background: 'linear-gradient(135deg,#818cf8,#a78bfa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {displayValue}
      {suffix}
    </div>
  );
}
