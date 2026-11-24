import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Backpack,
  Check,
  Home,
  PackagePlus,
  Paintbrush,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_TABS,
  getItemDef,
  InventorySlot,
  InventoryState,
  ItemCategory,
} from '../game/inventory';
import {
  EMPTY_OUTFIT_LOADOUT,
  EquippedOutfitLoadout,
  getXSuitItemDef,
  OUTFIT_SLOT_LABELS,
  OutfitSlot,
} from '../game/xSuits';
import { FurniturePreview3D } from './FurniturePreview3D';
import { CoinBadgeIcon, ItemIcon } from './ItemIcon';
import { OutfitPreview3D } from './OutfitPreview3D';
import { useViewportLayout } from '../game/useViewportLayout';

interface SelectedRef {
  zone: 'hotbar' | 'bag';
  index: number;
}

interface BackpackModalProps {
  open: boolean;
  coins: number;
  inventory: InventoryState;
  equippedOutfit?: EquippedOutfitLoadout;
  onToggleEquipOutfit?: (itemId: string) => void;
  inHomeHouse?: boolean;
  inFurnitureShop?: boolean;
  decorateMode?: boolean;
  onToggleDecorateMode?: () => void;
  replacingTargetName?: string | null;
  onCancelReplace?: () => void;
  onPlaceFurniture?: (itemId: string) => void;
  onSelectReplacement?: (itemId: string) => void;
  onClose: () => void;
  onOpenShop: () => void;
  onSelectHotbarIndex: (index: number) => void;
  onEquipFromBag: (bagIndex: number, targetHotbarIndex: number) => void;
  onStoreToBag: (hotbarIndex: number) => void;
  onMoveOrSwap: (
    fromZone: 'hotbar' | 'bag',
    fromIndex: number,
    toZone: 'hotbar' | 'bag',
    toIndex: number,
  ) => void;
  onUseItem: (zone: 'hotbar' | 'bag', index: number) => void;
  onDropItem: (zone: 'hotbar' | 'bag', index: number) => void;
  onSortBag: () => void;
  onRestockStarter: () => void;
  onUiSound: () => void;
}

export const BackpackModal: React.FC<BackpackModalProps> = ({
  open,
  coins,
  inventory,
  equippedOutfit = EMPTY_OUTFIT_LOADOUT,
  onToggleEquipOutfit,
  inHomeHouse = false,
  inFurnitureShop = false,
  decorateMode = false,
  onToggleDecorateMode,
  replacingTargetName = null,
  onCancelReplace,
  onPlaceFurniture,
  onSelectReplacement,
  onClose,
  onOpenShop,
  onSelectHotbarIndex,
  onEquipFromBag,
  onStoreToBag,
  onMoveOrSwap,
  onUseItem,
  onDropItem,
  onSortBag,
  onRestockStarter,
  onUiSound,
}) => {
  const { isLandscape, isCompactLandscape } = useViewportLayout();
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<SelectedRef>({
    zone: 'hotbar',
    index: inventory.selectedHotbarIndex,
  });
  const [movingFrom, setMovingFrom] = useState<SelectedRef | null>(null);

  useEffect(() => {
    if (open && replacingTargetName) {
      setActiveCategory('furniture');
    }
  }, [open, replacingTargetName]);

  const usedBagSlots = useMemo(
    () => inventory.bag.filter((s) => s.itemId !== null && s.qty > 0).length,
    [inventory.bag],
  );

  const totalItems = useMemo(() => {
    let sum = 0;
    for (const s of inventory.hotbar) sum += s.qty;
    for (const s of inventory.bag) sum += s.qty;
    return sum;
  }, [inventory.bag, inventory.hotbar]);

  const visibleBagEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const entries: Array<{ slot: InventorySlot; bagIndex: number }> = [];
    let lastOccupiedIdx = -1;
    for (let i = 0; i < inventory.bag.length; i++) {
      if (inventory.bag[i].itemId && inventory.bag[i].qty > 0) {
        lastOccupiedIdx = i;
      }
    }
    const maxUnfilteredIdx = movingFrom
      ? inventory.bag.length - 1
      : Math.min(inventory.bag.length - 1, Math.max(29, lastOccupiedIdx + 5));

    inventory.bag.forEach((slot, bagIndex) => {
      const def = getItemDef(slot.itemId);
      if (q) {
        if (!def || (!def.name.toLowerCase().includes(q) && !def.description.toLowerCase().includes(q))) {
          return;
        }
        if (activeCategory !== 'all' && def.category !== activeCategory) return;
        entries.push({ slot, bagIndex });
        return;
      }
      if (activeCategory === 'all') {
        if (bagIndex <= maxUnfilteredIdx) {
          entries.push({ slot, bagIndex });
        }
        return;
      }
      if (def && def.category === activeCategory) {
        entries.push({ slot, bagIndex });
      }
    });
    return entries;
  }, [activeCategory, inventory.bag, movingFrom, searchQuery]);

  if (!open) return null;

  const selectedSlot: InventorySlot | null =
    selected.zone === 'hotbar'
      ? inventory.hotbar[selected.index] ?? null
      : inventory.bag[selected.index] ?? null;

  const selectedDef = getItemDef(selectedSlot?.itemId);

  const handleSlotTap = (zone: 'hotbar' | 'bag', index: number) => {
    onUiSound();
    if (movingFrom) {
      if (movingFrom.zone === zone && movingFrom.index === index) {
        setMovingFrom(null);
        return;
      }
      onMoveOrSwap(movingFrom.zone, movingFrom.index, zone, index);
      setMovingFrom(null);
      setSelected({ zone, index });
      if (zone === 'hotbar') {
        onSelectHotbarIndex(index);
      }
      return;
    }

    setSelected({ zone, index });
    if (zone === 'hotbar') {
      onSelectHotbarIndex(index);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Player inventory"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      className="fixed inset-0 z-40 bg-sky-950/75 backdrop-blur-sm flex items-center justify-center pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-5"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="w-full max-w-5xl h-full sm:h-[88dvh] max-h-[96dvh] bg-[#f4f8ff] border-4 border-sky-500 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
        {/* Vibrant Top Header */}
        <header
          className={`bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 ${
            isCompactLandscape ? 'px-3 py-1.5' : 'px-3 py-2.5 sm:px-5 sm:py-3.5'
          } text-white flex items-center justify-between gap-2 shrink-0 border-b-4 border-sky-700/35`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`${
                isCompactLandscape ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl'
              } bg-amber-400 border-2 border-white text-slate-950 flex items-center justify-center shadow-md shrink-0`}
            >
              <Backpack className={isCompactLandscape ? 'w-4 h-4 stroke-[2.4]' : 'w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]'} />
            </div>
            <div className="min-w-0">
              <h2 className={`${isCompactLandscape ? 'text-sm' : 'text-base sm:text-xl'} font-extrabold tracking-tight leading-tight truncate`}>
                Inventory
              </h2>
              <div className="text-[10px] sm:text-xs font-semibold text-sky-100 tabular-nums truncate">
                {usedBagSlots} / {inventory.bag.length} Slots · {totalItems} Items
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              aria-label={`Coin balance: ${coins}`}
              className="hidden sm:flex min-h-[38px] sm:min-h-[42px] px-2.5 rounded-xl bg-slate-950/75 border-2 border-amber-300 text-amber-300 items-center gap-1.5"
            >
              <CoinBadgeIcon className="w-4 h-4 shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold tabular-nums">
                {coins.toLocaleString()}
              </span>
            </div>

            {inHomeHouse && onToggleDecorateMode && (
              <button
                type="button"
                onClick={() => {
                  onUiSound();
                  onToggleDecorateMode();
                }}
                aria-label={decorateMode ? 'Exit furniture decorate mode' : 'Enter furniture decorate mode'}
                aria-pressed={decorateMode}
                className={`${
                  isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2' : 'min-w-[44px] min-h-[44px] px-2.5 sm:px-3.5'
                } rounded-xl active:scale-95 border-2 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-transform ${
                  decorateMode
                    ? 'bg-emerald-400 border-white text-slate-950'
                    : 'bg-white/20 hover:bg-white/30 border-white/40 text-white'
                }`}
              >
                <Paintbrush className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {decorateMode ? 'Decorate: ON' : 'Decorate'}
                </span>
              </button>
            )}

            {inFurnitureShop && (
              <button
                type="button"
                onClick={() => {
                  onUiSound();
                  setMovingFrom(null);
                  onOpenShop();
                }}
                aria-label="Open furniture shop"
                className={`${
                  isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2' : 'min-w-[44px] min-h-[44px] px-2.5 sm:px-3.5'
                } rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 border-2 border-white text-slate-950 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-transform`}
              >
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">Shop</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onUiSound();
                setMovingFrom(null);
                onSortBag();
              }}
              aria-label="Sort backpack items"
              className={`${
                isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2' : 'min-w-[44px] min-h-[44px] px-2.5 sm:px-3.5'
              } rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 border-2 border-white/40 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-transform`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">Sort</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUiSound();
                setMovingFrom(null);
                onRestockStarter();
              }}
              aria-label="Restock starter items"
              className={`${
                isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2' : 'min-w-[44px] min-h-[44px] px-2.5 sm:px-3.5'
              } rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 border-2 border-white text-slate-950 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-transform`}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Refill</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUiSound();
                setMovingFrom(null);
                onClose();
              }}
              aria-label="Close backpack and return to game"
              className={`${
                isCompactLandscape ? 'min-w-[36px] min-h-[36px] px-2.5' : 'min-w-[44px] min-h-[44px] px-3 sm:px-4'
              } rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-95 border-2 border-white text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 cursor-pointer shadow-md transition-transform`}
            >
              <X className="w-5 h-5 stroke-[2.8]" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </header>

        {/* Scrollable Category Tabs */}
        <nav
          aria-label="Item categories"
          className={`bg-white border-b-2 border-slate-200 ${
            isCompactLandscape ? 'px-2.5 py-1.5' : 'px-3 py-2 sm:px-5'
          } flex items-center gap-1.5 sm:gap-2 overflow-x-auto shrink-0`}
        >
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onUiSound();
                  setActiveCategory(tab.id);
                }}
                aria-pressed={active}
                className={`${
                  isCompactLandscape ? 'min-h-[34px] px-2.5 text-[11px]' : 'min-h-[42px] px-3.5 sm:px-4 text-xs sm:text-sm'
                } rounded-xl border-2 font-extrabold whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer transition-all ${
                  active
                    ? 'bg-sky-500 border-sky-700 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-sm border border-black/20 shrink-0"
                  style={{ backgroundColor: tab.accent }}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <div className="relative ml-auto min-w-[140px] sm:min-w-[180px] shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bag..."
              aria-label="Search backpack"
              className={`w-full ${
                isCompactLandscape ? 'min-h-[32px]' : 'min-h-[38px]'
              } pl-8 pr-7 rounded-xl bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear backpack search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </nav>

        {/* Replace Mode Banner when replacing existing home furniture */}
        {replacingTargetName && (
          <div className="bg-indigo-600 border-b-2 border-indigo-800 px-4 py-2 text-xs sm:text-sm font-bold text-white flex items-center justify-between gap-2 shrink-0">
            <span>
              Select any furniture item to replace: <strong>{replacingTargetName}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                onUiSound();
                onCancelReplace?.();
              }}
              className="px-3 py-1 rounded-lg bg-white text-indigo-950 hover:bg-indigo-100 text-xs font-extrabold cursor-pointer shrink-0"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Swap Instruction Banner when moving item */}
        {movingFrom && (
          <div className="bg-amber-100 border-b-2 border-amber-300 px-4 py-2 text-xs sm:text-sm font-bold text-amber-950 flex items-center justify-between gap-2 shrink-0">
            <span>
              Tap any Bag or Hotbar slot to swap or stack this item
            </span>
            <button
              type="button"
              onClick={() => setMovingFrom(null)}
              className="px-3 py-1 rounded-lg bg-amber-300 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Main Responsive Content: Bag Grid (left/top) + Inspector & Quick Hotbar (right/bottom) */}
        <div
          className={`flex-1 min-h-0 flex ${
            isCompactLandscape
              ? 'grid grid-cols-[1fr_250px]'
              : isLandscape
                ? 'grid grid-cols-[1fr_290px] lg:grid-cols-[1fr_320px]'
                : 'flex-col lg:grid lg:grid-cols-[1fr_320px]'
          } overflow-hidden`}
        >
          {/* Bag Storage Slots */}
          <section
            aria-label="Backpack storage grid"
            className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-5 space-y-3"
          >
            {activeCategory === 'outfits' && (
              <div className="rounded-2xl bg-slate-900 border-2 border-fuchsia-400/70 p-3 text-white flex flex-wrap items-center gap-3 shadow-sm">
                <div className="w-16 h-20 rounded-xl bg-slate-950 border border-cyan-400/40 flex items-center justify-center overflow-hidden shrink-0">
                  <OutfitPreview3D
                    loadout={equippedOutfit}
                    alt="Equipped X-Suit loadout"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-[160px] grid grid-cols-2 gap-1.5">
                  {(['suit', 'helmet', 'boots', 'accessory'] as OutfitSlot[]).map((slot) => {
                    const id =
                      slot === 'suit'
                        ? equippedOutfit.suitId
                        : slot === 'helmet'
                          ? equippedOutfit.helmetId
                          : slot === 'boots'
                            ? equippedOutfit.bootsId
                            : equippedOutfit.accessoryId;
                    const itemDef = getXSuitItemDef(id);
                    return (
                      <div
                        key={slot}
                        className="rounded-xl bg-slate-800/90 border border-slate-700 px-2 py-1.5 flex items-center justify-between gap-1 text-[10px]"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-400">{OUTFIT_SLOT_LABELS[slot]}</div>
                          <div className="font-extrabold text-white truncate">
                            {itemDef ? itemDef.name : 'None'}
                          </div>
                        </div>
                        {itemDef && onToggleEquipOutfit && (
                          <button
                            type="button"
                            onClick={() => {
                              onUiSound();
                              onToggleEquipOutfit(itemDef.id);
                            }}
                            aria-label={`Unequip ${itemDef.name}`}
                            className="w-5 h-5 rounded-md bg-slate-700 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {visibleBagEntries.length === 0 ? (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 sm:p-6 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                <Backpack className="w-9 h-9 text-slate-400 mb-2" />
                <div className="text-sm font-bold text-slate-700">
                  {activeCategory === 'outfits'
                    ? 'No X-Suits unlocked yet'
                    : 'No items in this category yet'}
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {activeCategory === 'outfits'
                    ? 'Open the Shopping Market and watch completed rewarded ads to unlock futuristic X-Suits & Cyber Wings.'
                    : 'Break blocks around the city to collect materials, or tap Refill to restock starter supplies.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                {visibleBagEntries.map(({ slot, bagIndex }) => {
                  const def = getItemDef(slot.itemId);
                  const isSelected =
                    selected.zone === 'bag' && selected.index === bagIndex;
                  const isMovingSrc =
                    movingFrom?.zone === 'bag' && movingFrom.index === bagIndex;
                  const isWornOutfit = Boolean(
                    def &&
                      (equippedOutfit.suitId === def.id ||
                        equippedOutfit.helmetId === def.id ||
                        equippedOutfit.bootsId === def.id ||
                        equippedOutfit.accessoryId === def.id),
                  );

                  return (
                    <button
                      key={`bag-${bagIndex}`}
                      type="button"
                      onClick={() => handleSlotTap('bag', bagIndex)}
                      aria-label={
                        def
                          ? `${def.name}, quantity ${slot.qty}`
                          : `Empty bag slot ${bagIndex + 1}`
                      }
                      className={`relative ${
                        isCompactLandscape ? 'min-h-[54px] p-1 rounded-xl' : 'min-h-[64px] sm:min-h-[84px] p-1.5 sm:p-2 rounded-2xl'
                      } border-3 flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer ${
                        isMovingSrc
                          ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400'
                          : isSelected
                            ? 'bg-sky-50 border-sky-500 shadow-md'
                            : isWornOutfit
                              ? 'bg-fuchsia-50 border-fuchsia-500 shadow-sm'
                              : def
                                ? 'bg-white hover:bg-slate-50 border-slate-300 shadow-sm'
                                : 'bg-slate-200/70 hover:bg-slate-200 border-slate-300/80'
                      }`}
                    >
                      {def ? (
                        <>
                          <div
                            className={`${
                              isCompactLandscape ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 sm:w-12 sm:h-12 rounded-xl'
                            } flex items-center justify-center`}
                            style={{ backgroundColor: def.bgHex }}
                          >
                            <ItemIcon itemId={def.id} size="md" />
                          </div>
                          {!isCompactLandscape && (
                            <span className="hidden sm:block text-[11px] font-bold text-slate-700 leading-tight truncate max-w-full px-1">
                              {def.name}
                            </span>
                          )}
                          <span className="absolute top-1 right-1 px-1 py-0.5 rounded-md bg-slate-900 text-white text-[9px] sm:text-[11px] font-extrabold leading-none tabular-nums">
                            {isWornOutfit ? 'ON' : slot.qty}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">
                          Empty
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right/Bottom Panel: Selected Item Inspector + Action Controls */}
          <aside
            aria-label="Selected item details and actions"
            className={`bg-white ${
              isLandscape ? 'border-l-2 border-t-0 overflow-y-auto' : 'border-t-2 lg:border-t-0 lg:border-l-2'
            } border-slate-200 ${
              isCompactLandscape ? 'p-2.5' : 'p-3 sm:p-4'
            } flex flex-col justify-between gap-2.5 shrink-0`}
          >
            {selectedDef && selectedSlot && selectedSlot.qty > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-18 h-18 rounded-2xl border-2 border-slate-200 flex items-center justify-center shrink-0 shadow-inner overflow-hidden p-1"
                    style={{ backgroundColor: selectedDef.bgHex }}
                  >
                    {selectedDef.category === 'outfits' ? (
                      <OutfitPreview3D
                        itemId={selectedDef.id}
                        alt={selectedDef.name}
                        className="w-full h-full object-contain"
                        fallbackSize="lg"
                      />
                    ) : selectedDef.isHomeFurniture || selectedDef.category === 'doors' ? (
                      <FurniturePreview3D
                        itemId={selectedDef.id}
                        alt={selectedDef.name}
                        className="w-full h-full object-contain"
                        fallbackSize="lg"
                      />
                    ) : (
                      <ItemIcon itemId={selectedDef.id} size="lg" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600">
                      {selectedDef.category} · Qty {selectedSlot.qty}
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight truncate">
                      {selectedDef.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                      {selectedDef.description}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {selectedDef.category === 'outfits' && onToggleEquipOutfit && (
                    <button
                      type="button"
                      onClick={() => {
                        onUiSound();
                        onToggleEquipOutfit(selectedDef.id);
                      }}
                      className={`col-span-2 min-h-[46px] px-4 rounded-xl border-2 text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-97 ${
                        equippedOutfit.suitId === selectedDef.id ||
                        equippedOutfit.helmetId === selectedDef.id ||
                        equippedOutfit.bootsId === selectedDef.id ||
                        equippedOutfit.accessoryId === selectedDef.id
                          ? 'bg-slate-900 border-emerald-400 text-emerald-300'
                          : 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 border-fuchsia-900 text-white'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {equippedOutfit.suitId === selectedDef.id ||
                        equippedOutfit.helmetId === selectedDef.id ||
                        equippedOutfit.bootsId === selectedDef.id ||
                        equippedOutfit.accessoryId === selectedDef.id
                          ? 'Equipped on Player (Tap to Unequip)'
                          : 'Equip X-Suit on Character'}
                      </span>
                    </button>
                  )}

                  {replacingTargetName && selectedDef.isHomeFurniture && onSelectReplacement && (
                    <button
                      type="button"
                      onClick={() => {
                        onUiSound();
                        onSelectReplacement(selectedDef.id);
                      }}
                      className="col-span-2 min-h-[46px] px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 active:scale-97 border-2 border-indigo-800 text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <RefreshCw className="w-4 h-4 stroke-[2.6]" />
                      <span>Replace With {selectedDef.name}</span>
                    </button>
                  )}

                  {!replacingTargetName && selectedDef.isHomeFurniture && onPlaceFurniture && (
                    <button
                      type="button"
                      onClick={() => {
                        onUiSound();
                        onPlaceFurniture(selectedDef.id);
                      }}
                      className="col-span-2 min-h-[46px] px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-97 border-2 border-emerald-800 text-slate-950 text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Home className="w-4 h-4 stroke-[2.6]" />
                      <span>
                        {inHomeHouse ? 'Place in House' : 'Place in House (Enter a House)'}
                      </span>
                    </button>
                  )}

                  {selectedDef.consumableEffect && (
                    <button
                      type="button"
                      onClick={() => {
                        onUiSound();
                        onUseItem(selected.zone, selected.index);
                      }}
                      className="col-span-2 min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-97 border-2 border-emerald-700 text-slate-950 text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Use / Consume Now</span>
                    </button>
                  )}

                  {selected.zone === 'bag' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onUiSound();
                        onEquipFromBag(selected.index, inventory.selectedHotbarIndex);
                        setSelected({
                          zone: 'hotbar',
                          index: inventory.selectedHotbarIndex,
                        });
                      }}
                      className="min-h-[44px] px-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-97 border-2 border-sky-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4 stroke-[2.8]" />
                      <span>Equip Slot {inventory.selectedHotbarIndex + 1}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onUiSound();
                        onStoreToBag(selected.index);
                      }}
                      className="min-h-[44px] px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:scale-97 border-2 border-indigo-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>Store in Bag</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onUiSound();
                      setMovingFrom(selected);
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-97 border-2 border-amber-600 text-slate-950 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Move / Swap</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUiSound();
                      onDropItem(selected.zone, selected.index);
                    }}
                    className="col-span-2 min-h-[44px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-97 border-2 border-rose-300 text-rose-700 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Stack</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-3 text-center text-xs font-semibold text-slate-500">
                Tap any item in your Backpack or Hotbar to inspect, equip, or use it.
              </div>
            )}
          </aside>
        </div>

        {/* Bottom Docked Quick Hotbar (Slots 1-5) */}
        <footer
          className={`bg-slate-900 ${
            isCompactLandscape ? 'px-2.5 py-1.5' : 'px-3 py-2.5 sm:px-5 sm:py-3'
          } border-t-4 border-slate-700 shrink-0`}
        >
          {!isCompactLandscape && (
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-300">
                Quick Hotbar (1–5)
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Active: Slot {inventory.selectedHotbarIndex + 1}
              </span>
            </div>
          )}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {inventory.hotbar.map((slot, idx) => {
              const def = getItemDef(slot.itemId);
              const isHotbarSelected =
                selected.zone === 'hotbar' && selected.index === idx;
              const isActiveEquipped = inventory.selectedHotbarIndex === idx;
              const isMovingSrc =
                movingFrom?.zone === 'hotbar' && movingFrom.index === idx;

              return (
                <button
                  key={`hb-modal-${idx}`}
                  type="button"
                  onClick={() => handleSlotTap('hotbar', idx)}
                  aria-label={
                    def
                      ? `Hotbar slot ${idx + 1}: ${def.name}, quantity ${slot.qty}`
                      : `Empty hotbar slot ${idx + 1}`
                  }
                  className={`relative ${
                    isCompactLandscape ? 'min-h-[42px] rounded-xl' : 'min-h-[54px] sm:min-h-[64px] rounded-2xl'
                  } border-3 flex flex-col items-center justify-center p-1 cursor-pointer transition-transform active:scale-95 ${
                    isMovingSrc
                      ? 'bg-amber-400/30 border-amber-300'
                      : isActiveEquipped || isHotbarSelected
                        ? 'bg-slate-800 border-amber-400 shadow-lg'
                        : 'bg-slate-800/70 hover:bg-slate-800 border-slate-600'
                  }`}
                >
                  <span className="absolute top-1 left-1.5 text-[10px] font-extrabold text-slate-400">
                    {idx + 1}
                  </span>
                  {def ? (
                    <>
                      <ItemIcon itemId={def.id} size="sm" />
                      <span className="text-[10px] font-bold text-white truncate max-w-full px-1 mt-0.5 hidden sm:block">
                        {def.name}
                      </span>
                      <span className="absolute bottom-1 right-1.5 text-[11px] font-extrabold text-amber-300 tabular-nums leading-none">
                        {slot.qty}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">
                      Empty
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </footer>
      </div>
    </div>
  );
};
