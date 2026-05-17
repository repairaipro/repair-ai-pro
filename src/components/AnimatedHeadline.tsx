'use client';

import { motion } from 'framer-motion';

interface AnimatedHeadlineProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  delay?: number;
}

export function AnimatedHeadline({
  children,
  className = '',
  style = {},
  as: Component = 'h1',
  delay = 0,
}: AnimatedHeadlineProps) {
  const words = children.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: delay * i },
    }),
  };

  const child = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      className={className}
      style={style}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
    >
      {Component === 'h1' && (
        <h1 className="flex flex-wrap gap-2">
          {words.map((word, i) => (
            <motion.span key={i} variants={child}>
              {word}
            </motion.span>
          ))}
        </h1>
      )}
      {Component === 'h2' && (
        <h2 className="flex flex-wrap gap-2">
          {words.map((word, i) => (
            <motion.span key={i} variants={child}>
              {word}
            </motion.span>
          ))}
        </h2>
      )}
      {Component === 'h3' && (
        <h3 className="flex flex-wrap gap-2">
          {words.map((word, i) => (
            <motion.span key={i} variants={child}>
              {word}
            </motion.span>
          ))}
        </h3>
      )}
      {Component === 'h4' && (
        <h4 className="flex flex-wrap gap-2">
          {words.map((word, i) => (
            <motion.span key={i} variants={child}>
              {word}
            </motion.span>
          ))}
        </h4>
      )}
    </motion.div>
  );
}

interface AnimatedSubheadlineProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}

export function AnimatedSubheadline({
  children,
  className = '',
  style = {},
  delay = 0,
}: AnimatedSubheadlineProps) {
  return (
    <motion.p
      className={className}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{
        type: 'spring',
        damping: 12,
        stiffness: 100,
        delay,
      }}
    >
      {children}
    </motion.p>
  );
}
