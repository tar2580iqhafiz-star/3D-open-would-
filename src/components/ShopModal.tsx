import React, { useMemo, useState } from 'react';
import {
  Backpack,
  Check,
  Lock,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tv,
  X,
} from 'lucide-react';
import { BLOCK_STYLES, ExtendedBlockStyleId, getExtendedBlockByItemId } from '../game/blockCatalog';
import { getItemDef, InventoryState } from '../game/inventory';
import {
  AdRewardTarget,
  COIN_REWARD_OPTIONS,
} from '../game/rewardedAds';
import {
  SHOP_CATALOG,
  SHOP_CATEGORIES,
  ShopCategory,
  ShopListing,
} from '../game/shop';
import {
  AdUnlockTier,
  EquippedOutfitLoadout,
  EXCLUSIVE_XSUIT_CATALOG,
  OUTFIT_SLOT_LABELS,
  RARITY_STYLE,
  XSuitItemDef,
} from '../game/xSuits';
import { useViewportLayout } from '../game/useViewportLayout';
import { FurniturePreview3D } from './FurniturePreview3D';
import { CoinBadgeIcon, ItemIcon } from './ItemIcon';
import { OutfitPreview3D } from './OutfitPreview3D';

type ShopViewCategory = ShopCategory | 'rewards';

interface ShopModalProps {
  open: boolean;
  coins: number;
  inventory: InventoryState;
  unlockedOutfits: string[];
  equippedOutfit: EquippedOutfitLoadout;
  adProgress: Record<string, number>;
  onClose: () => void;
  onOpenBackpack: () => void;
  onPurchase: (listing: ShopListing) => void;
  onWatchRewardedAd: (target: AdRewardTarget) => void;
  onEquipOutfitItem: (itemId: string) => void;
  onUiSound: () => void;
}

const PAGE_STEP = 48;

function isOutfitItemEquipped(item: XSuitItemDef, loadout: EquippedOutfitLoadout): boolean {
  switch (item.slot) {
    case 'suit':
      return loadout.suitId === item.id;
    case 'helmet':
      return loadout.helmetId === item.id;
    case 'boots':
      return loadout.bootsId === item.id;
    case 'accessory':
      return loadout.accessoryId === item.id;
  }
}

export const ShopModal: React.FC<ShopModalProps> = ({
  open,
  coins,
  inventory,
  unlockedOutfits,
  equippedOutfit,
  adProgress,
  onClose,
  onOpenBackpack,
  onPurchase,
  onWatchRewardedAd,
  onEquipOutfitItem,
  onUiSound,
}) => {
  const { isCompactLandscape } = useViewportLayout();
  const [activeCategory, setActiveCategory] = useState<ShopViewCategory>('all');
  const [adTierFilter, setAdTierFilter] = useState<AdUnlockTier | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blockStyleFilter, setBlockStyleFilter] = useState<ExtendedBlockStyleId | 'all'>('all');
  const [visibleLimit, setVisibleLimit] = useState(PAGE_STEP);

  const unlockedSet = useMemo(() => new Set(unlockedOutfits), [unlockedOutfits]);

  const ownedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of inventory.hotbar) {
      if (s.itemId && s.qty > 0) {
        counts.set(s.itemId, (counts.get(s.itemId) ?? 0) + s.qty);
      }
    }
    for (const s of inventory.bag) {
      if (s.itemId && s.qty > 0) {
        counts.set(s.itemId, (counts.get(s.itemId) ?? 0) + s.qty);
      }
    }
    return counts;
  }, [inventory.bag, inventory.hotbar]);

  const filteredListings = useMemo(() => {
    if (activeCategory === 'rewards') return [];
    const q = searchQuery.trim().toLowerCase();
    return SHOP_CATALOG.filter((entry) => {
      if (activeCategory !== 'all' && entry.category !== activeCategory) {
        return false;
      }
      if (activeCategory === 'blocks' && blockStyleFilter !== 'all') {
        const ext = getExtendedBlockByItemId(entry.itemId);
        if (!ext || ext.style !== blockStyleFilter) return false;
      }
      if (q) {
        const def = getItemDef(entry.itemId);
        if (!def) return false;
        if (
          !def.name.toLowerCase().includes(q) &&
          !def.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeCategory, blockStyleFilter, searchQuery]);

  const filteredXSuits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXCLUSIVE_XSUIT_CATALOG.filter((item) => {
      if (adTierFilter !== 'all' && item.requiredAds !== adTierFilter) return false;
      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.rarity.toLowerCase().includes(q) ||
          OUTFIT_SLOT_LABELS[item.slot].toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [adTierFilter, searchQuery]);

  const isFiltered = searchQuery.trim().length > 0 || (activeCategory === 'blocks' && blockStyleFilter !== 'all');
  const visibleListings = useMemo(() => {
    if (isFiltered || filteredListings.length <= visibleLimit) {
      return filteredListings;
    }
    return filteredListings.slice(0, visibleLimit);
  }, [filteredListings, isFiltered, visibleLimit]);

  const remainingCount = Math.max(0, filteredListings.length - visibleListings.length);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping market and rewarded X-Suits"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      className="fixed inset-0 z-40 bg-indigo-950/75 backdrop-blur-sm flex items-center justify-center pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-5"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="w-full max-w-5xl h-full sm:h-[88dvh] max-h-[96dvh] bg-[#fffaf5] border-4 border-amber-400 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
        {/* Top Shop Header */}
        <header
          className={`bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 ${
            isCompactLandscape ? 'px-3 py-1.5' : 'px-3 py-2.5 sm:px-5 sm:py-3.5'
          } text-white flex items-center justify-between gap-2 shrink-0 border-b-4 border-orange-700/35`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`${
                isCompactLandscape ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl'
              } bg-white text-orange-600 border-2 border-amber-200 flex items-center justify-center shadow-md shrink-0`}
            >
              <Store className={isCompactLandscape ? 'w-4 h-4 stroke-[2.4]' : 'w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]'} />
            </div>
            <div className="min-w-0">
              <h2 className={`${isCompactLandscape ? 'text-sm' : 'text-base sm:text-xl'} font-extrabold tracking-tight leading-tight truncate`}>
                City Shopping Market &amp; X-Suits
              </h2>
              {!isCompactLandscape && (
                <div className="text-[11px] sm:text-xs font-semibold text-amber-100 truncate">
                  Watch rewarded ads for coins &amp; X-Suits, or buy 255+ blocks &amp; 3D furniture
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              aria-label={`Current coin balance: ${coins} coins`}
              className={`${
                isCompactLandscape ? 'min-h-[36px] px-2.5' : 'min-h-[44px] px-3'
              } rounded-xl bg-slate-950/85 border-2 border-amber-300 text-amber-300 flex items-center gap-1.5 shadow-sm`}
            >
              <CoinBadgeIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="text-xs sm:text-base font-extrabold tabular-nums">
                {coins.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onUiSound();
                onOpenBackpack();
              }}
              aria-label="Open inventory"
              className={`${
                isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2' : 'min-w-[44px] min-h-[44px] px-2.5 sm:px-3.5'
              } rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 border-2 border-white text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-transform`}
            >
              <Backpack className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Inventory</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUiSound();
                onClose();
              }}
              aria-label="Close shopping market"
              className={`${
                isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2.5' : 'min-w-[44px] min-h-[44px] px-3 sm:px-4'
              } rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 border-2 border-white text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 cursor-pointer shadow-md transition-transform`}
            >
              <X className="w-5 h-5 stroke-[2.8]" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </header>

        {/* Scrollable Category Tabs (Includes Prominent Ads & X-Suits Tab) */}
        <nav
          aria-label="Shop categories"
          className={`bg-white border-b-2 border-amber-200 ${
            isCompactLandscape ? 'px-2.5 py-1.5' : 'px-3 py-2 sm:px-5'
          } flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0`}
        >
          <button
            type="button"
            onClick={() => {
              onUiSound();
              setActiveCategory('rewards');
            }}
            aria-pressed={activeCategory === 'rewards'}
            className={`${
              isCompactLandscape ? 'min-h-[34px] px-2.5 text-[11px]' : 'min-h-[42px] px-3.5 sm:px-4 text-xs sm:text-sm'
            } rounded-xl border-2 font-extrabold whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer transition-all ${
              activeCategory === 'rewards'
                ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 border-fuchsia-300 text-white shadow-md'
                : 'bg-fuchsia-50 hover:bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900'
            }`}
          >
            <Tv className="w-3.5 h-3.5 shrink-0" />
            <span>Ads &amp; X-Suits</span>
          </button>

          {SHOP_CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onUiSound();
                  setActiveCategory(cat.id);
                  setBlockStyleFilter('all');
                  setVisibleLimit(PAGE_STEP);
                }}
                aria-pressed={active}
                className={`${
                  isCompactLandscape ? 'min-h-[34px] px-2.5 text-[11px]' : 'min-h-[42px] px-3.5 sm:px-4 text-xs sm:text-sm'
                } rounded-xl border-2 font-extrabold whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer transition-all ${
                  active
                    ? 'bg-amber-500 border-amber-700 text-slate-950 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-sm border border-black/20 shrink-0"
                  style={{ backgroundColor: cat.accent }}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Search & Filter Bar */}
        <div className="bg-amber-50/70 border-b border-amber-200 px-3 py-2 sm:px-5 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeCategory === 'rewards'
                  ? 'Search X-Suits, helmets, boots, wings...'
                  : 'Search colors, blocks, glass, glow, or furniture...'
              }
              aria-label="Search shop items"
              className="w-full min-h-[38px] pl-9 pr-8 rounded-xl bg-white border border-amber-300 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeCategory === 'rewards' && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
              {(
                [
                  { id: 'all', label: 'All Tiers' },
                  { id: 2, label: '2 Ads · Gear' },
                  { id: 3, label: '3 Ads · Suits' },
                  { id: 4, label: '4 Ads · Mythic X-Suits' },
                ] as const
              ).map((tier) => (
                <button
                  key={String(tier.id)}
                  type="button"
                  onClick={() => {
                    onUiSound();
                    setAdTierFilter(tier.id);
                  }}
                  className={`min-h-[34px] px-2.5 rounded-lg border text-[11px] font-extrabold whitespace-nowrap cursor-pointer ${
                    adTierFilter === tier.id
                      ? 'bg-fuchsia-600 border-fuchsia-800 text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          )}

          {activeCategory === 'blocks' && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
              <button
                type="button"
                onClick={() => {
                  onUiSound();
                  setBlockStyleFilter('all');
                }}
                className={`min-h-[34px] px-2.5 rounded-lg border text-[11px] font-extrabold whitespace-nowrap cursor-pointer ${
                  blockStyleFilter === 'all'
                    ? 'bg-emerald-500 border-emerald-700 text-slate-950'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Styles
              </button>
              {BLOCK_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onUiSound();
                    setBlockStyleFilter(st.id);
                  }}
                  className={`min-h-[34px] px-2.5 rounded-lg border text-[11px] font-extrabold whitespace-nowrap cursor-pointer ${
                    blockStyleFilter === st.id
                      ? 'bg-emerald-500 border-emerald-700 text-slate-950'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}

          <span className="text-[11px] font-bold text-slate-600 tabular-nums shrink-0">
            {activeCategory === 'rewards'
              ? `${filteredXSuits.length} exclusive items`
              : `${filteredListings.length} items`}
          </span>
        </div>

        {/* Main Scrollable Market Content */}
        <section
          aria-label="Shop items catalog"
          className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-5"
        >
          {activeCategory === 'rewards' ? (
            <>
              {/* Top Equipped Character Preview + Ad Rules Notice */}
              <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-fuchsia-950 border-2 border-fuchsia-400/60 p-3.5 sm:p-4 text-white flex flex-col sm:flex-row items-center gap-3.5 shadow-lg">
                <div className="w-24 h-28 rounded-2xl bg-slate-900/90 border-2 border-cyan-400/50 flex items-center justify-center overflow-hidden shrink-0 p-1">
                  <OutfitPreview3D
                    loadout={equippedOutfit}
                    alt="Current equipped player character preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-cyan-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rewarded Ads &amp; Exclusive X-Suit Vault</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black mt-0.5">
                    Earn Free Coins &amp; Unlock Cyber X-Suits
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Watch completed ads to earn coin vaults or permanently unlock futuristic X-Suits (2 ads for cyber gear, 3 ads for combat suits, 4 ads for Mythic X-Suits).
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Strict Ad Rule: Skipped or closed-early ads grant 0 progress and 0 unlocks.</span>
                  </div>
                </div>
              </div>

              {/* 1. Coin Reward Options */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                    <CoinBadgeIcon className="w-5 h-5" />
                    <span>Free Coin Rewards (Watch Completed Ads)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">Repeatable</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {COIN_REWARD_OPTIONS.map((opt) => {
                    const watched = adProgress[opt.id] ?? 0;
                    const remaining = Math.max(1, opt.requiredAds - watched);
                    const pct = Math.round((watched / opt.requiredAds) * 100);

                    return (
                      <article
                        key={opt.id}
                        className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm p-3 flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-black text-white"
                              style={{ backgroundColor: opt.accentHex }}
                            >
                              +{opt.coins} Coins
                            </span>
                            <span className="text-[11px] font-extrabold text-slate-600 tabular-nums">
                              {watched}/{opt.requiredAds} Ads
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2.5">
                            <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                              <CoinBadgeIcon className="w-7 h-7" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-slate-900 truncate">
                                {opt.title}
                              </h4>
                              <p className="text-[11px] text-slate-600 line-clamp-2">
                                {opt.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2.5">
                            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: opt.accentHex }}
                              />
                            </div>
                            <div className="mt-1 text-[10px] font-bold text-slate-500 tabular-nums">
                              {remaining} {remaining === 1 ? 'ad' : 'ads'} left for +{opt.coins} coins
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onUiSound();
                            onWatchRewardedAd({
                              kind: 'coins',
                              id: opt.id,
                              title: opt.title,
                              requiredAds: opt.requiredAds,
                              coins: opt.coins,
                            });
                          }}
                          className="w-full min-h-[42px] px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 active:scale-96 border-2 border-amber-700 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Watch Ad (+{opt.coins})</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* 2. Exclusive Ad-Only X-Suits & Cyber Gear */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-fuchsia-600" />
                    <span>Exclusive Futuristic X-Suits &amp; Gear</span>
                  </h3>
                  <span className="text-[11px] font-extrabold text-fuchsia-700">
                    Unlocked {unlockedOutfits.length}/{EXCLUSIVE_XSUIT_CATALOG.length}
                  </span>
                </div>

                {filteredXSuits.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center bg-white rounded-2xl border-2 border-dashed border-fuchsia-300 p-4">
                    <div className="text-sm font-extrabold text-slate-800">No matching X-Suits</div>
                    <div className="text-xs text-slate-500 mt-1">Try clearing filters or searching for &ldquo;Mythic&rdquo;, &ldquo;Wings&rdquo;, or &ldquo;Helmet&rdquo;.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    {filteredXSuits.map((item) => {
                      const unlocked = unlockedSet.has(item.id);
                      const equipped = unlocked && isOutfitItemEquipped(item, equippedOutfit);
                      const watched = unlocked ? item.requiredAds : (adProgress[item.id] ?? 0);
                      const remaining = Math.max(0, item.requiredAds - watched);
                      const pct = Math.round((watched / item.requiredAds) * 100);
                      const rarityMeta = RARITY_STYLE[item.rarity];

                      return (
                        <article
                          key={item.id}
                          className="bg-white rounded-2xl border-2 shadow-sm p-2.5 sm:p-3.5 flex flex-col justify-between gap-2.5"
                          style={{
                            borderColor: unlocked ? '#10b981' : rarityMeta.border,
                            boxShadow: `0 6px 18px -8px ${rarityMeta.cardGlow}`,
                          }}
                        >
                          <div>
                            <div
                              className="relative w-full h-32 sm:h-36 rounded-xl border border-slate-200 flex items-center justify-center mb-2.5 overflow-hidden p-1"
                              style={{
                                background: `radial-gradient(circle at 50% 25%, #1e293b 0%, ${item.primaryHex} 100%)`,
                              }}
                            >
                              <OutfitPreview3D
                                itemId={item.id}
                                alt={`${item.name} 3D character preview`}
                                className="w-full h-full object-contain drop-shadow-md"
                                fallbackSize="lg"
                              />

                              <span
                                className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-black shadow-sm"
                                style={{
                                  backgroundColor: rarityMeta.badgeBg,
                                  color: rarityMeta.badgeText,
                                }}
                              >
                                {item.rarity}
                              </span>

                              {unlocked && (
                                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center gap-0.5">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  {equipped ? 'Equipped' : 'Owned'}
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-fuchsia-700">
                              {OUTFIT_SLOT_LABELS[item.slot]}
                            </div>
                            <h4 className="text-sm font-black text-slate-900 leading-tight truncate mt-0.5">
                              {item.name}
                            </h4>
                            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 min-h-[30px]">
                              {item.description}
                            </p>

                            {!unlocked && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-700 tabular-nums mb-1">
                                  <span>Ad Progress</span>
                                  <span>
                                    {watched}/{item.requiredAds} ({remaining} left)
                                  </span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                onUiSound();
                                onEquipOutfitItem(item.id);
                              }}
                              className={`w-full min-h-[44px] px-3 rounded-xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer transition-transform active:scale-96 ${
                                equipped
                                  ? 'bg-slate-900 border-emerald-400 text-emerald-300'
                                  : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-slate-950 shadow-sm'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[2.8]" />
                              <span>{equipped ? 'Equipped (Unequip)' : 'Equip Outfit'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onUiSound();
                                onWatchRewardedAd({
                                  kind: 'outfit',
                                  id: item.id,
                                  title: item.name,
                                  requiredAds: item.requiredAds,
                                  itemId: item.id,
                                });
                              }}
                              className="w-full min-h-[44px] px-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 active:scale-96 border-2 border-fuchsia-900 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                              <span className="truncate">
                                Watch Ad ({watched}/{item.requiredAds})
                              </span>
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Highlighted Rewards Banner at top of 'all' view */}
              {activeCategory === 'all' && !searchQuery.trim() && (
                <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-fuchsia-900 to-slate-900 border-2 border-fuchsia-400 p-3 sm:p-4 text-white flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-fuchsia-500 border border-white/40 flex items-center justify-center shrink-0">
                      <Tv className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-white">
                        Rewarded Ads: Free Coins &amp; Mythic X-Suits
                      </div>
                      <div className="text-[11px] text-fuchsia-100/90">
                        Watch completed ads to earn up to +500 coins or unlock 14 exclusive futuristic X-Suits!
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onUiSound();
                      setActiveCategory('rewards');
                    }}
                    className="min-h-[42px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 border-2 border-white text-slate-950 text-xs sm:text-sm font-black flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Open Rewards &amp; X-Suits</span>
                  </button>
                </div>
              )}

              {visibleListings.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center bg-white rounded-2xl border-2 border-dashed border-amber-300 p-4">
                  <div className="text-sm font-extrabold text-slate-800">No matching blocks or items</div>
                  <div className="text-xs text-slate-500 mt-1">Try another color like &ldquo;pink&rdquo;, &ldquo;glow&rdquo;, &ldquo;brick&rdquo;, or &ldquo;glass&rdquo;.</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {visibleListings.map((listing) => {
                    const def = getItemDef(listing.itemId);
                    if (!def) return null;
                    const owned = ownedCounts.get(def.id) ?? 0;
                    const canAfford = coins >= listing.price;
                    const missing = listing.price - coins;
                    const show3dPreview = Boolean(def.isHomeFurniture || def.category === 'doors');

                    return (
                      <article
                        key={listing.id}
                        className="bg-white rounded-2xl border-2 border-amber-200/90 shadow-sm p-2.5 sm:p-3.5 flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div
                            className="relative w-full h-28 sm:h-32 rounded-xl border border-slate-200 flex items-center justify-center mb-2.5 overflow-hidden p-1.5"
                            style={{
                              background: `radial-gradient(circle at 50% 35%, #ffffff 0%, ${def.bgHex} 100%)`,
                            }}
                          >
                            {show3dPreview ? (
                              <FurniturePreview3D
                                itemId={def.id}
                                alt={`${def.name} 3D preview`}
                                className="w-full h-full object-contain drop-shadow-sm"
                                fallbackSize="lg"
                              />
                            ) : (
                              <ItemIcon itemId={def.id} size="lg" />
                            )}

                            {listing.bundleQty > 1 && (
                              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-extrabold tabular-nums">
                                ×{listing.bundleQty}
                              </span>
                            )}

                            {listing.tag && (
                              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                                {listing.tag}
                              </span>
                            )}

                            {owned > 0 && (
                              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/95 border border-slate-300 text-slate-800 text-[10px] font-bold flex items-center gap-0.5 tabular-nums">
                                <Check className="w-3 h-3 text-emerald-600 stroke-[2.8]" />
                                {owned}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                            {def.name}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 line-clamp-2 min-h-[30px]">
                            {def.description}
                          </p>
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 text-slate-900 font-extrabold text-sm tabular-nums">
                            <CoinBadgeIcon className="w-4 h-4 shrink-0" />
                            <span>{listing.price}</span>
                          </div>

                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => onPurchase(listing)}
                            aria-label={
                              canAfford
                                ? `Buy ${def.name} for ${listing.price} coins`
                                : `Insufficient coins for ${def.name}, need ${missing} more coins`
                            }
                            className={`min-h-[44px] flex-1 px-2.5 rounded-xl border-2 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 transition-transform ${
                              canAfford
                                ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 border-emerald-700 text-slate-950 cursor-pointer shadow-sm'
                                : 'bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {canAfford ? (
                              <>
                                <ShoppingBag className="w-4 h-4 shrink-0" />
                                <span>Buy</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Need {missing}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {remainingCount > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUiSound();
                      setVisibleLimit((prev) => prev + PAGE_STEP);
                    }}
                    className="min-h-[44px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 border-2 border-amber-700 text-slate-950 text-xs sm:text-sm font-extrabold cursor-pointer shadow-sm"
                  >
                    Load More Blocks ({remainingCount} left)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUiSound();
                      setVisibleLimit(filteredListings.length);
                    }}
                    className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-slate-100 active:scale-95 border-2 border-slate-300 text-slate-800 text-xs sm:text-sm font-bold cursor-pointer"
                  >
                    Show All
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};
