/**
 * أمثلة عملية لاستخدام التحسينات الجديدة
 * Copy & Paste للاستخدام الفوري
 */

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DailyRewardsSpinner 
} from "./src/components/DailyRewardsSpinner";
import { 
  PremiumCard, 
  AnimatedStat, 
  ProgressRing, 
  GlowingBadge 
} from "./src/components/EnhancedUIComponents";
import { 
  useThrottle, 
  useDebounce, 
  useRequestIdleCallback 
} from "./src/hooks/usePerformance";
import { 
  generateDailyRewards, 
  calculateNextClaimTime, 
  formatClaimCountdown 
} from "./src/lib/dailyRewards";
import { Gift, Zap, TrendingUp } from "lucide-react";

/**
 * مثال 1: دمج نظام المكافآت اليومية
 */
export function DailyRewardsExample() {
  const [showSpinner, setShowSpinner] = useState(false);
  const [rewards] = useState(() => generateDailyRewards());
  const [currentDay, setCurrentDay] = useState(1);
  const [claimed, setClaimed] = useState<Set<number>>(new Set());

  const handleClaimReward = useCallback((day: number) => {
    setClaimed(prev => new Set(prev).add(day));
    // إرسال API request
    console.log(`تم المطالبة بمكافأة اليوم ${day}`);
  }, []);

  return (
    <div className="space-y-4">
      {/* زر المكافآت اليومية */}
      <motion.button
        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center gap-2"
        onClick={() => setShowSpinner(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Gift size={20} />
        المكافآت اليومية
      </motion.button>

      {/* عجلة المكافآت */}
      <DailyRewardsSpinner
        isOpen={showSpinner}
        onClose={() => setShowSpinner(false)}
        onClaim={handleClaimReward}
        rewards={rewards}
        currentDay={currentDay}
      />

      {/* عرض الحالة */}
      <div className="text-center text-sm text-slate-400">
        {claimed.has(currentDay) ? (
          "✅ تم المطالبة اليوم"
        ) : (
          `اليوم ${currentDay} من 30`
        )}
      </div>
    </div>
  );
}

/**
 * مثال 2: استخدام مكونات UI المحسّنة
 */
export function EnhancedUIExample() {
  return (
    <div className="space-y-6">
      {/* PremiumCard */}
      <PremiumCard variant="gold" hover="lift">
        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            بطاقة فخمة
          </h3>
          <p className="text-slate-300">
            استخدم PremiumCard للعناصر الرئيسية الهامة
          </p>
        </div>
      </PremiumCard>

      {/* AnimatedStat */}
      <div className="grid grid-cols-2 gap-4">
        <AnimatedStat
          label="إجمالي النقاط"
          value="125,480"
          color="gold"
          trend="up"
        />
        <AnimatedStat
          label="المستوى"
          value="42"
          color="violet"
          trend="up"
        />
      </div>

      {/* GlowingBadge */}
      <div className="space-y-2">
        <GlowingBadge color="gold">
          ⭐ نجم الأسبوع
        </GlowingBadge>
        <GlowingBadge color="emerald">
          ✅ نشط اليوم
        </GlowingBadge>
      </div>

      {/* ProgressRing */}
      <div className="flex justify-center">
        <ProgressRing
          value={65}
          max={100}
          label="المستوى التالي"
          size="md"
        />
      </div>
    </div>
  );
}

/**
 * مثال 3: استخدام خطافات الأداء
 */
export function PerformanceExample() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<string[]>([]);

  // Debounce لمدخلات المستخدم (مثل البحث)
  const handleSearch = useDebounce((value: string) => {
    console.log("البحث عن:", value);
    // إرسال طلب بحث API
    setResults([`نتيجة 1 لـ ${value}`, `نتيجة 2 لـ ${value}`]);
  }, 500);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    handleSearch(value);
  }, [handleSearch]);

  // Throttle للعمليات المتكررة (مثل التمرير)
  const handleScroll = useThrottle(() => {
    console.log("تم التمرير");
    // تحميل بيانات جديدة
  }, 300);

  // requestIdleCallback للعمليات غير الحرجة
  useRequestIdleCallback(() => {
    console.log("تم تحديث الإحصائيات (غير حرج)");
    // تحديث البيانات التحليلية
  });

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="ابحث عن شيء..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full px-4 py-2 rounded-lg bg-slate-800 text-white"
      />

      <div className="space-y-2">
        {results.map((result, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-slate-800 text-slate-200"
          >
            {result}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * مثال 4: إنشاء شاشة مخصصة
 */
export function CustomDashboard() {
  const rewards = useMemo(() => generateDailyRewards(), []);
  const [stats, setStats] = useState({
    points: 125480,
    level: 42,
    pph: 1240,
    energy: 80,
  });

  // محاكاة تحديث البيانات
  useRequestIdleCallback(() => {
    setStats(prev => ({
      ...prev,
      pph: prev.pph + Math.random() * 10,
    }));
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      {/* الرأس */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          لوحة التحكم
        </h1>
        <p className="text-slate-400">
          مرحبا بك في النسخة المحسّنة
        </p>
      </div>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <AnimatedStat
          label="النقاط"
          value={stats.points.toLocaleString()}
          color="gold"
        />
        <AnimatedStat
          label="المستوى"
          value={stats.level}
          color="violet"
        />
        <AnimatedStat
          label="PPH"
          value={Math.floor(stats.pph)}
          color="cyan"
        />
        <AnimatedStat
          label="الطاقة"
          value={`${stats.energy}%`}
          color="emerald"
        />
      </div>

      {/* بطاقات المحتوى */}
      <div className="space-y-4">
        <PremiumCard variant="gold">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="text-amber-400" size={24} />
              <h2 className="text-xl font-bold text-white">
                البث السريع
              </h2>
            </div>
            <p className="text-slate-300 mb-4">
              الضغط السريع يعطيك مكافآت إضافية كل 4.5 ثواني
            </p>
            <motion.button
              className="w-full py-2 px-4 rounded-lg bg-amber-500 text-white font-bold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              اضغط الآن
            </motion.button>
          </div>
        </PremiumCard>

        <PremiumCard variant="cyan">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-cyan-400" size={24} />
              <h2 className="text-xl font-bold text-white">
                الترقيات
              </h2>
            </div>
            <p className="text-slate-300 mb-4">
              حسّن قوتك بترقيات استراتيجية
            </p>
            <motion.button
              className="w-full py-2 px-4 rounded-lg bg-cyan-500 text-white font-bold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              عرض الترقيات
            </motion.button>
          </div>
        </PremiumCard>
      </div>

      {/* شارات */}
      <div className="mt-8 space-y-2">
        <h3 className="text-lg font-bold text-white mb-3">
          الإنجازات
        </h3>
        <div className="flex flex-wrap gap-2">
          <GlowingBadge color="gold">⭐ نجم الأسبوع</GlowingBadge>
          <GlowingBadge color="emerald">✅ مشارك نشط</GlowingBadge>
          <GlowingBadge color="violet">👑 مضاعف الطاقة</GlowingBadge>
        </div>
      </div>
    </div>
  );
}

/**
 * مثال 5: إضافة التحسينات تدريجياً
 */
export function GradualImplementation() {
  return (
    <div className="space-y-8">
      {/* المرحلة الأولى: المكافآت اليومية */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">
          المرحلة 1: المكافآت اليومية
        </h2>
        <PremiumCard>
          <div className="p-6 text-center">
            <p className="text-slate-300 mb-4">
              ابدأ بإضافة نظام المكافآت اليومية أولاً
            </p>
            <code className="block bg-slate-800 p-4 rounded text-left text-sm text-green-400">
              {`import { DailyRewardsSpinner } from "@/components/DailyRewardsSpinner";`}
            </code>
          </div>
        </PremiumCard>
      </section>

      {/* المرحلة الثانية: مكونات UI */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">
          المرحلة 2: مكونات UI المحسّنة
        </h2>
        <PremiumCard variant="cyan">
          <div className="p-6 text-center">
            <p className="text-slate-300 mb-4">
              أضف مكونات UI الجديدة تدريجياً
            </p>
            <code className="block bg-slate-800 p-4 rounded text-left text-sm text-green-400">
              {`import { PremiumCard, AnimatedStat } from "@/components/EnhancedUIComponents";`}
            </code>
          </div>
        </PremiumCard>
      </section>

      {/* المرحلة الثالثة: تحسينات الأداء */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">
          المرحلة 3: تحسينات الأداء
        </h2>
        <PremiumCard variant="violet">
          <div className="p-6 text-center">
            <p className="text-slate-300 mb-4">
              استخدم خطافات الأداء الجديدة
            </p>
            <code className="block bg-slate-800 p-4 rounded text-left text-sm text-green-400">
              {`import { useThrottle, useDebounce } from "@/hooks/usePerformance";`}
            </code>
          </div>
        </PremiumCard>
      </section>
    </div>
  );
}

export default CustomDashboard;
