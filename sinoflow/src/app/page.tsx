"use client";

import { AnimatePresence, motion } from "motion/react";
import { DashboardView } from "@/components/Dashboard/DashboardView";
import { NarratedDemoPlayer } from "@/components/NarratedDemoPlayer";
import { PitchDeck } from "@/components/PitchDeck";
import { TopBar } from "@/components/TopBar";
import { AppProvider, useApp } from "@/state/AppProvider";

function Shell() {
  const { mode } = useApp();
  return (
    <>
      <TopBar />
      <main>
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {mode === "deck" ? <PitchDeck /> : <DashboardView />}
          </motion.div>
        </AnimatePresence>
      </main>
      <NarratedDemoPlayer />
    </>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
