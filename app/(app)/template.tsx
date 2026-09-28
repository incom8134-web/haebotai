"use client";

import { motion } from "motion/react";

// One quick moment per navigation: the new page fades and lifts in.
// No blur — animating a filter over the whole page was expensive on
// phones. MotionConfig reducedMotion="user" (app/layout.tsx) turns this
// into an instant swap for people who ask for less motion.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
