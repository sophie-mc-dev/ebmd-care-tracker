import React, { useState } from 'react';
import {
  Droplets,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  Shield,
  Tag,
  Star,
} from 'lucide-react';
import { AppSettings, TreatmentType } from '../types/ebmd';
import { DEFAULT_COMMON_PRODUCTS, getConfiguredProducts } from '../utils/storage';
import { sound } from '../utils/audio';

interface ProductsSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (updatedSettings: AppSettings) => void;
  soundEnabled?: boolean;
}

const CATEGORY_CONFIG: {
  id: TreatmentType;
  label: string;
  emoji: string;
  description: string;
  suggestions: string[];
}[] = [
  {
    id: 'drops',
    label: 'Eye Drops',
    emoji: '💧',
    description: 'Daytime preservative-free artificial tears and hypertonic sodium chloride drops.',
    suggestions: [
      'Hylo-Forte 0.2% PF',
      'Cationorm Emulsion',
      'Blink Intensive Tears',
      'Ivizia Lubricant Eye Drops',
      'Oasis TEARS PLUS PF',
    ],
  },
  {
    id: 'gel',
    label: 'Eye Gels',
    emoji: '🧴',
    description: 'Thicker viscosity gels for evening corneal hydration and longer dwell time.',
    suggestions: [
      'Viscotears Liquid Gel',
      'Xailin Gel Carbomer',
      'Artelac Nighttime Gel',
      'Vidisic Eye Gel',
    ],
  },
  {
    id: 'ointment',
    label: 'Bedtime Ointments',
    emoji: '🛡️',
    description: 'High-viscosity nocturnal barriers (prevents eyelid-corneal adhesion upon waking).',
    suggestions: [
      'Vita-POS / Hylo Night Ointment',
      'Xailin Night Ointment',
      'Lacri-Lube Ophthalmic Ointment',
      'Soothe Night Time Ointment',
    ],
  },
  {
    id: 'other',
    label: 'Shields & Adjuncts',
    emoji: '✨',
    description: 'Moisture chambers, goggles, warm compress pads, and prescription therapies.',
    suggestions: [
      'Bandage Contact Lens (BCL)',
      'Eye Eco Onyix Shield',
      'Bruder Moist Heat Eye Compress',
      'Blephaclean Eyelid Wipes',
      'Prokera Amniotic Membrane',
    ],
  },
];

export const ProductsSettings: React.FC<ProductsSettingsProps> = ({
  settings,
  onUpdateSettings,
  soundEnabled = true,
}) => {
  const [activeCategory, setActiveCategory] = useState<TreatmentType>('drops');
  const [newProductName, setNewProductName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const configured = getConfiguredProducts(settings);
  const currentList = configured[activeCategory] || [];
  const activeCategoryMeta = CATEGORY_CONFIG.find((c) => c.id === activeCategory)!;

  const showNotification = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const updateProductList = (category: TreatmentType, newList: string[]) => {
    const updatedProducts = {
      ...configured,
      [category]: newList,
    };
    onUpdateSettings({
      ...settings,
      configuredProducts: updatedProducts,
    });
  };

  const handleAddProduct = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newProductName.trim();
    if (!trimmed) return;

    if (currentList.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      showNotification(`"${trimmed}" is already in the list`);
      return;
    }

    const newList = [...currentList, trimmed];
    updateProductList(activeCategory, newList);
    setNewProductName('');
    if (soundEnabled) sound.playGentleBeep(520, 0.08);
    showNotification(`Added "${trimmed}" to ${activeCategoryMeta.label}`);
  };

  const handleAddSuggestion = (name: string) => {
    if (currentList.some((p) => p.toLowerCase() === name.toLowerCase())) {
      showNotification(`"${name}" is already in the list`);
      return;
    }
    const newList = [...currentList, name];
    updateProductList(activeCategory, newList);
    if (soundEnabled) sound.playGentleBeep(520, 0.08);
    showNotification(`Added "${name}"`);
  };

  const handleDeleteProduct = (index: number) => {
    const deletedName = currentList[index];
    const newList = currentList.filter((_, i) => i !== index);
    updateProductList(activeCategory, newList);
    if (soundEnabled) sound.playGentleBeep(350, 0.05);
    showNotification(`Removed "${deletedName}"`);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(currentList[index]);
  };

  const handleSaveEdit = (index: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setEditingIndex(null);
      return;
    }
    const newList = [...currentList];
    newList[index] = trimmed;
    updateProductList(activeCategory, newList);
    setEditingIndex(null);
    if (soundEnabled) sound.playGentleBeep(520, 0.08);
    showNotification('Product updated');
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const newList = [...currentList];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    updateProductList(activeCategory, newList);
    if (soundEnabled) sound.playGentleBeep(480, 0.05);
  };

  const handleResetCategory = () => {
    const defaults = DEFAULT_COMMON_PRODUCTS[activeCategory] || [];
    updateProductList(activeCategory, [...defaults]);
    if (soundEnabled) sound.playGentleBeep(440, 0.1);
    showNotification(`Reset ${activeCategoryMeta.label} to clinical defaults`);
  };

  const handleResetAll = () => {
    if (
      window.confirm(
        'Reset all product/brand lists across Drops, Gels, Ointments, and Shields to default recommendations?'
      )
    ) {
      onUpdateSettings({
        ...settings,
        configuredProducts: { ...DEFAULT_COMMON_PRODUCTS },
      });
      if (soundEnabled) sound.playGentleBeep(440, 0.1);
      showNotification('Reset all categories to clinical defaults');
    }
  };

  // Available suggestions not yet added
  const availableSuggestions = activeCategoryMeta.suggestions.filter(
    (s) => !currentList.some((p) => p.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Default Products & Brands
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure the quick-select brand chips that show up when logging your daily eye care
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAll}
            title="Reset all categories to factory defaults"
            className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset All</span>
          </button>
        </div>

        {savedNotice && (
          <div className="mt-3 py-1.5 px-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CATEGORY_CONFIG.map((cat) => {
          const count = configured[cat.id]?.length || 0;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setEditingIndex(null);
                if (soundEnabled) sound.playGentleBeep(450, 0.04);
              }}
              className={`p-3 rounded-2xl border text-left transition relative cursor-pointer active:scale-98 ${
                isActive
                  ? 'bg-white dark:bg-slate-800 border-teal-500 ring-2 ring-teal-500/30 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-base">{cat.emoji}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </div>
              <div
                className={`text-xs font-bold ${
                  isActive ? 'text-teal-700 dark:text-teal-300' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {cat.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Category Product Management */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        {/* Category Header & Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeCategoryMeta.emoji}</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeCategoryMeta.label} ({currentList.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activeCategoryMeta.description}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetCategory}
            className="self-start sm:self-auto text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset {activeCategoryMeta.label}</span>
          </button>
        </div>

        {/* Add Product Form */}
        <form onSubmit={handleAddProduct} className="flex gap-2">
          <input
            type="text"
            placeholder={`Add new ${activeCategoryMeta.label.toLowerCase()} brand...`}
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={!newProductName.trim()}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {/* Product List */}
        <div className="space-y-2">
          {currentList.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Droplets className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No products in this category
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Add a custom product or click &quot;Reset&quot; to restore defaults.
              </p>
            </div>
          ) : (
            currentList.map((product, index) => {
              const isFirst = index === 0;
              const isLast = index === currentList.length - 1;
              const isEditing = editingIndex === index;

              return (
                <div
                  key={`${product}_${index}`}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-2 group hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(index);
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        autoFocus
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-teal-500 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(index)}
                        className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition cursor-pointer"
                        title="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-slate-400 w-4 shrink-0 text-center">
                          {index + 1}
                        </span>

                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {product}
                        </span>

                        {isFirst && (
                          <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>Primary Default</span>
                          </span>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={isFirst}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Move Up (Makes it higher priority)"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={isLast}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(index)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-500/10 transition cursor-pointer"
                          title="Rename product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(index)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete from list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick Suggestions */}
        {availableSuggestions.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Recommended EBMD additions for {activeCategoryMeta.label}:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAddSuggestion(suggestion)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Plus className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Preview of Chips */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Preview in Log Daily Care Modal
            </span>
            <span className="text-[10px] text-slate-400">
              Primary brand is preselected
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5">
            {currentList.map((prod, idx) => (
              <span
                key={prod}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                  idx === 0
                    ? 'bg-teal-700 text-white font-semibold border-teal-700 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {prod}
              </span>
            ))}
            <span className="text-[11px] px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400">
              + Custom Brand
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
