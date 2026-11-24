import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Play, ShieldCheck, Tv, X } from 'lucide-react';
import { AdRewardTarget, AdWatchOutcome, resolveRewardedAdConfig } from '../game/rewardedAds';
import { getXSuitItemDef, RARITY_STYLE } from '../game/xSuits';
import { CoinBadgeIcon, ItemIcon } from './ItemIcon';

interface RewardedAdModalProps {
  target: AdRewardTarget | null;
  watchedBefore: number;
  onComplete: (outcome: AdWatchOutcome) => void;
}

const AD_DURATION_SECONDS = 6;

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  target,
  watchedBefore,
  onComplete,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SECONDS);
  const [confirmEarlyClose, setConfirmEarlyClose] = useState(false);

  const adConfig = React.useMemo(() => resolveRewardedAdConfig(), []);

  useEffect(() => {
    if (!target) return;
    setSecondsLeft(AD_DURATION_SECONDS);
    setConfirmEarlyClose(false);

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [target]);

  if (!target || adConfig.isProduction) return null;

  const isCompleted = secondsLeft <= 0;
  const progressPct = Math.round(
    ((AD_DURATION_SECONDS - secondsLeft) / AD_DURATION_SECONDS) * 100,
  );
  const outfitDef = target.kind === 'outfit' ? getXSuitItemDef(target.itemId) : undefined;
  const rarityMeta = outfitDef ? RARITY_STYLE[outfitDef.rarity] : null;
  const nextWatchCount = Math.min(target.requiredAds, watchedBefore + 1);
  const remainingAfterThis = Math.max(0, target.requiredAds - nextWatchCount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rewarded advertisement player"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Top AdMob Test Header */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shrink-0">
              {adConfig.isTestMode ? 'Test Ad' : 'Rewarded Ad'}
            </span>
            <span className="text-xs font-bold text-slate-300 truncate">
              Ad Unit: {adConfig.adUnitId}
            </span>
          </div>

          {!isCompleted ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-xs font-extrabold tabular-nums text-amber-300">
                {secondsLeft}s
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!confirmEarlyClose) {
                    setConfirmEarlyClose(true);
                  } else {
                    onComplete('closed_early');
                  }
                }}
                aria-label="Close ad early"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-600 border border-slate-600 text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-extrabold flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          )}
        </div>

        {/* Interactive Test Ad Stage */}
        <div className="relative px-5 py-6 sm:py-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-3 shadow-lg">
            {target.kind === 'coins' ? (
              <CoinBadgeIcon className="w-11 h-11" />
            ) : (
              <ItemIcon itemId={target.itemId} size="lg" />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1">
            <Tv className="w-3.5 h-3.5" />
            <span>
              {adConfig.isTestMode
                ? 'Google Mobile Ads · Test Preview'
                : 'Google AdMob · Rewarded Video'}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
            {target.title}
          </h3>

          {rarityMeta && (
            <span
              className="mt-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold"
              style={{ backgroundColor: rarityMeta.badgeBg, color: rarityMeta.badgeText }}
            >
              {rarityMeta.label}
            </span>
          )}

          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-sm">
            {isCompleted ? (
              remainingAfterThis === 0 ? (
                target.kind === 'coins'
                  ? `Ad finished! Claim your +${target.coins} Coin reward now.`
                  : `Ad finished! Tap Claim below to unlock ${target.title}.`
              ) : (
                `Ad finished! Progress saved (${nextWatchCount}/${target.requiredAds}). ${remainingAfterThis} more ad${remainingAfterThis === 1 ? '' : 's'} remaining.`
              )
            ) : (
              `Watch until the countdown reaches 0 to credit ad ${nextWatchCount} of ${target.requiredAds}.`
            )}
          </p>

          {/* Countdown Progress Bar */}
          <div className="w-full max-w-xs mt-5">
            <div className="h-2.5 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 tabular-nums">
              <span>{isCompleted ? 'Reward Verified' : 'Playing Sponsored Ad...'}</span>
              <span>{progressPct}%</span>
            </div>
          </div>
        </div>

        {/* Strict Early-Exit Warning */}
        {confirmEarlyClose && !isCompleted && (
          <div className="px-4 py-2.5 bg-rose-950/90 border-t border-rose-700 text-rose-100 flex items-center justify-between gap-2 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Skipping now grants ZERO progress and ZERO rewards!</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmEarlyClose(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-extrabold cursor-pointer"
              >
                Keep Watching
              </button>
              <button
                type="button"
                onClick={() => onComplete('skipped')}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold cursor-pointer"
              >
                Skip (No Reward)
              </button>
            </div>
          </div>
        )}

        {/* Footer Action Bar */}
        <div className="px-4 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          {!isCompleted ? (
            <>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Rewards require 100% completion</span>
              </div>
              <button
                type="button"
                onClick={() => setConfirmEarlyClose(true)}
                className="min-h-[42px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold cursor-pointer shrink-0"
              >
                Skip Ad
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onComplete('completed')}
              className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 active:scale-98 border-2 border-emerald-200 text-slate-950 text-sm sm:text-base font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {target.kind === 'coins' && remainingAfterThis === 0
                  ? `Claim +${target.coins} Coins`
                  : remainingAfterThis === 0
                    ? `Claim & Unlock ${target.title}`
                    : `Save Ad Credit (${nextWatchCount}/${target.requiredAds})`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
