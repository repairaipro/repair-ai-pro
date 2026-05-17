'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Sparkles } from 'lucide-react';

interface AnimatedCelebrationProps {
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showConfetti?: boolean;
}

export function AnimatedCelebration({
  title,
  message,
  action,
  showConfetti = true,
}: AnimatedCelebrationProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 space-y-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 25,
      }}
    >
      {/* Animated icon */}
      <motion.div
        className="relative"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #10b981, #6366f1)',
          }}
        >
          <CheckCircle className="w-12 h-12 text-white" />
        </motion.div>

        {/* Sparkles around the icon */}
        {showConfetti && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  opacity: 0,
                  x: 0,
                  y: 0,
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  x: Math.cos((i * 2 * Math.PI) / 3) * 80,
                  y: Math.sin((i * 2 * Math.PI) / 3) * 80,
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
                style={{ top: '50%', left: '50%', translateX: '-50%', translateY: '-50%' }}
              >
                <Sparkles className="w-6 h-6 text-amber-400" />
              </motion.div>
            ))}
          </>
        )}
      </motion.div>

      {/* Title */}
      <motion.div
        className="text-center space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2
          className="text-3xl font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h2>
        {message && (
          <p
            className="text-base"
            style={{ color: 'var(--color-text-3)' }}
          >
            {message}
          </p>
        )}
      </motion.div>

      {/* Action button */}
      {action && (
        <motion.button
          className="btn btn-primary mt-4"
          onClick={action.onClick}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

interface ConfettiPieceProps {
  index: number;
}

function ConfettiPiece({ index }: ConfettiPieceProps) {
  const angle = (index / 12) * Math.PI * 2;
  const x = Math.cos(angle) * 200;
  const y = Math.sin(angle) * 200;

  return (
    <motion.div
      className="fixed w-2 h-2 rounded-full pointer-events-none"
      style={{
        top: '50%',
        left: '50%',
        background: ['#818cf8', '#fbbf24', '#10b981', '#ef4444'][index % 4],
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x,
        y,
        opacity: 0,
        scale: 0,
      }}
      transition={{
        duration: 1.5,
        ease: 'easeOut',
        delay: 0,
      }}
    />
  );
}

export function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </div>
  );
}
