/**
 * Mini-App UI Integration Guide
 * How to use animations and premium styles in your components
 */

import React from "react";
import {
  FloatingParticles,
  PulsingGlow,
  ShakeAnimation,
  BounceCard,
  GradientPulse,
  StaggeredList,
  CounterAnimation,
  SlideIn,
  RotatingSpinner,
  PopupNotification,
  ProgressRing,
  ConfettiBurst,
  TiltCard,
} from "@/components/animations";

/**
 * EXAMPLE 1: Dashboard with Floating Particles
 */
export function DashboardWithBackground() {
  return (
    <div className="page-container">
      <FloatingParticles count={25} />
      <div className="relative z-10">
        <h1 className="text-gradient text-4xl font-bold mb-8">
          VaultTap Dashboard
        </h1>
        {/* Your dashboard content */}
      </div>
    </div>
  );
}

/**
 * EXAMPLE 2: Animated Stats Cards
 */
export function StatsSection() {
  const stats = [
    { label: "Total Points", value: 12500 },
    { label: "Current Energy", value: 450 },
    { label: "PPH", value: 1200 },
  ];

  return (
    <StaggeredList className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, idx) => (
        <BounceCard
          key={idx}
          className="card gradient-primary p-6 rounded-xl cursor-pointer hover:shadow-lg"
        >
          <PulsingGlow>
            <div className="text-center">
              <p className="text-gray-300 text-sm mb-2">{stat.label}</p>
              <CounterAnimation value={stat.value} className="text-3xl font-bold text-white" />
            </div>
          </PulsingGlow>
        </BounceCard>
      ))}
    </StaggeredList>
  );
}

/**
 * EXAMPLE 3: Task Completion with Animation
 */
export function TaskCard({ task }: { task: any }) {
  const [claimed, setClaimed] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const handleClaim = () => {
    setClaimed(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <SlideIn direction="up">
      <div className="card card-hover p-4 rounded-lg mb-3 relative">
        <ShakeAnimation isActive={claimed}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{task.name}</h3>
              <p className="text-sm text-gray-400">+{task.reward} points</p>
            </div>
            <button
              onClick={handleClaim}
              className="btn-primary px-4 py-2 rounded"
              disabled={claimed}
            >
              {claimed ? "✓ Claimed" : "Claim"}
            </button>
          </div>
        </ShakeAnimation>

        {showSuccess && (
          <PopupNotification type="success" message={`+${task.reward} points!`} />
        )}
      </div>
    </SlideIn>
  );
}

/**
 * EXAMPLE 4: Leaderboard with Progress Rings
 */
export function LeaderboardEntry({
  rank,
  username,
  score,
  userRank,
}: {
  rank: number;
  username: string;
  score: number;
  userRank: number;
}) {
  const isCurrentUser = rank === userRank;
  const maxScore = 500000;
  const percentage = (score / maxScore) * 100;

  return (
    <TiltCard className={`card p-4 rounded-lg mb-2 ${isCurrentUser ? 'glow-lg' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="text-2xl font-bold text-purple-400 w-8 text-center">#{rank}</div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-white">{username}</h3>
          <ProgressRing percentage={percentage} size={30} strokeWidth={2} />
        </div>

        <div className="text-right">
          <CounterAnimation
            value={score}
            className="text-xl font-bold text-pink-400"
          />
          <p className="text-xs text-gray-400">points</p>
        </div>
      </div>
    </TiltCard>
  );
}

/**
 * EXAMPLE 5: Loading State
 */
export function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="text-center">
        <RotatingSpinner />
        <p className="mt-4 text-gray-300">Loading your data...</p>
      </div>
    </div>
  );
}

/**
 * EXAMPLE 6: Achievement Unlock
 */
export function AchievementUnlock({ title }: { title: string }) {
  return (
    <SlideIn direction="down">
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <GradientPulse>
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-8 rounded-2xl text-center shadow-2xl">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-white text-2xl font-bold">{title}</h2>
            <p className="text-purple-100 mt-2">Achievement Unlocked!</p>
          </div>
        </GradientPulse>
        <ConfettiBurst />
      </div>
    </SlideIn>
  );
}

/**
 * EXAMPLE 7: Using Premium CSS Classes
 */
export function PremiumStylesShowcase() {
  return (
    <div className="page-container">
      {/* Glass Morphism Card */}
      <div className="glass p-6 rounded-2xl mb-4">
        <h2 className="text-gradient text-xl font-bold">Glass Morphism</h2>
        <p>This card has a frosted glass effect</p>
      </div>

      {/* Glowing Text */}
      <h1 className="text-gradient text-3xl font-bold text-shadow mb-4">
        Glowing Text Effect
      </h1>

      {/* Button Variants */}
      <div className="flex gap-3 mb-4">
        <button className="btn-primary px-6 py-2">Primary</button>
        <button className="btn-secondary px-6 py-2">Secondary</button>
        <button className="btn-outline px-6 py-2">Outline</button>
      </div>

      {/* Badge Variants */}
      <div className="flex gap-3">
        <span className="badge-primary px-3 py-1">Badge</span>
        <span className="badge-success px-3 py-1">Success</span>
      </div>
    </div>
  );
}

/**
 * INTEGRATION CHECKLIST:
 *
 * ✅ Import premium.css globally in main.tsx
 * ✅ Import animation components where needed
 * ✅ Replace card components with BounceCard
 * ✅ Add FloatingParticles to main layouts
 * ✅ Use CounterAnimation for number displays
 * ✅ Use SlideIn for page transitions
 * ✅ Use PopupNotification for alerts
 * ✅ Use ProgressRing for progress displays
 * ✅ Add TiltCard to interactive elements
 * ✅ Use StaggeredList for lists
 * ✅ Apply premium CSS classes to text and containers
 * ✅ Test responsiveness on mobile
 * ✅ Test animations on actual Telegram client
 * ✅ Commit and push changes
 * ✅ Deploy to Vercel
 */

/**
 * COMPONENT USAGE REFERENCE:
 *
 * FloatingParticles: Background animation, add to layout
 *   <FloatingParticles count={20} />
 *
 * PulsingGlow: Adds pulsing shadow effect
 *   <PulsingGlow><YourContent /></PulsingGlow>
 *
 * ShakeAnimation: Trigger on events
 *   <ShakeAnimation isActive={error}><YourContent /></ShakeAnimation>
 *
 * BounceCard: Replace regular cards
 *   <BounceCard className="..."><YourContent /></BounceCard>
 *
 * GradientPulse: Animated gradient background
 *   <GradientPulse><YourContent /></GradientPulse>
 *
 * StaggeredList: Animate list items
 *   <StaggeredList>{items.map(...)}</StaggeredList>
 *
 * CounterAnimation: Animate numbers
 *   <CounterAnimation value={1234} />
 *
 * SlideIn: Page/element entrance
 *   <SlideIn direction="up"><YourContent /></SlideIn>
 *
 * RotatingSpinner: Loading indicator
 *   <RotatingSpinner />
 *
 * PopupNotification: Toast notifications
 *   <PopupNotification type="success" message="Done!" />
 *
 * ProgressRing: Circular progress
 *   <ProgressRing percentage={75} size={40} />
 *
 * ConfettiBurst: Celebration effect
 *   <ConfettiBurst />
 *
 * TiltCard: 3D tilt on hover
 *   <TiltCard><YourContent /></TiltCard>
 */

export default AchievementUnlock;
