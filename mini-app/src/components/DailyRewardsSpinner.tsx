/**
 * Daily Rewards Spinner Wheel Component
 * Gamified daily claim experience
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import type { DailyReward } from "@/lib/dailyRewards";

export interface SpinnerProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (day: number) => void;
  rewards: DailyReward[];
  currentDay: number;
  isLoading?: boolean;
}

/**
 * Spinning wheel animation for daily rewards
 */
export function DailyRewardsSpinner({
  isOpen,
  onClose,
  onClaim,
  rewards,
  currentDay,
  isLoading = false,
}: SpinnerProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedReward, setSelectedReward] = useState<number | null>(null);

  const handleSpin = useCallback(async () => {
    if (isSpinning || isLoading) return;
    
    setIsSpinning(true);
    const spinDuration = 2800;
    const finalRotation = (currentDay - 1) * 12 + 360 * 5; // 5 full rotations + position

    // Trigger spin animation
    const wheelEl = document.querySelector(".spinner-wheel");
    if (wheelEl) {
      (wheelEl as HTMLElement).style.transform = `rotate(${finalRotation}deg)`;
    }

    // Wait for animation + celebration
    await new Promise(resolve => setTimeout(resolve, spinDuration + 600));
    
    setSelectedReward(currentDay);
    setIsSpinning(false);
  }, [isSpinning, isLoading, currentDay]);

  const handleClaimReward = useCallback(() => {
    if (selectedReward) {
      onClaim(selectedReward);
      setSelectedReward(null);
      setTimeout(onClose, 1200);
    }
  }, [selectedReward, onClaim, onClose]);

  const currentReward = rewards[currentDay - 1];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="spinner-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="spinner-modal"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="spinner-header">
              <h2 className="spinner-title">🎉 Daily Rewards</h2>
              <motion.button
                className="spinner-close"
                onClick={onClose}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </div>

            {/* Wheel or Selection */}
            {!selectedReward ? (
              <div className="spinner-wheel-container">
                <div className="spinner-wheel" style={{ 
                  transition: isSpinning ? "transform 2.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none"
                }}>
                  {rewards.map((reward, idx) => {
                    const angle = (idx * 360) / rewards.length;
                    return (
                      <div
                        key={idx}
                        className="spinner-slice"
                        style={{ transform: `rotate(${angle}deg)` }}
                      >
                        <div className="spinner-slice-content">
                          <span className="spinner-icon">{reward.icon}</span>
                          <span className="spinner-day">Day {reward.day}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Center indicator */}
                <div className="spinner-indicator">
                  ⭐
                </div>
              </div>
            ) : (
              /* Claim screen after spin */
              <motion.div
                className="spinner-claim"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="spinner-reward-icon"
                >
                  {currentReward?.icon}
                </motion.div>
                <h3 className="spinner-claim-title">You Won!</h3>
                <p className="spinner-claim-desc">Day {currentDay} Reward</p>
                <div className="spinner-claim-amount">
                  <span className="spinner-amount-icon">🪙</span>
                  <span className="spinner-amount-value">
                    {Math.floor(currentReward!.baseReward * currentReward!.multiplier)}
                  </span>
                </div>
                {currentReward!.multiplier > 1 && (
                  <p className="spinner-multiplier">×{currentReward!.multiplier} Streak Bonus!</p>
                )}
              </motion.div>
            )}

            {/* Actions */}
            <div className="spinner-actions">
              {!selectedReward ? (
                <motion.button
                  className="spinner-btn spinner-btn--primary"
                  onClick={handleSpin}
                  disabled={isSpinning || isLoading}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLoading ? "Claiming..." : isSpinning ? "Spinning..." : "Spin Now"}
                </motion.button>
              ) : (
                <motion.button
                  className="spinner-btn spinner-btn--success"
                  onClick={handleClaimReward}
                  whileTap={{ scale: 0.95 }}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  ⬇️ Claim Reward
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
