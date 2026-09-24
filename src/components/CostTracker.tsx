import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Check,
  X,
  Tag,
} from 'lucide-react';
import { ExpenseItem } from '../types/ebmd';
import { sound } from '../utils/audio';

interface CostTrackerProps {
  expenses: ExpenseItem[];
  onSaveExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  soundEnabled?: boolean;
}

const CATEGORIES = [
  { id: 'ointment', label: '🛡️ Night Ointment' },
  { id: 'drops', label: '💧 Lubricating Drops' },
  { id: 'gel', label: '🧴 Eye Gel' },
  { id: 'mask_goggles', label: '🥽 Sleep Mask / Goggles' },
  { id: 'prescription', label: '💊 Prescriptions / BCL' },
  { id: 'doctor_visit', label: '🏥 Specialist Copay / Clinic' },
  { id: 'other', label: '✨ Other Supplies' },
] as const;

const QUICK_PRODUCTS = [
  { name: 'Muro 128 5% Ointment (3.5g)', category: 'ointment', price: 28.99 },
  { name: 'Systane Complete PF (60 ct)', category: 'drops', price: 21.49 },
  { name: 'Refresh Celluvisc (30 ct)', category: 'gel', price: 16.99 },
  { name: 'Eye Eco Eyeseals 4.0 Goggles', category: 'mask_goggles', price: 44.5 },
  { name: 'Muro 128 5% Drops (15 mL)', category: 'drops', price: 24.5 },
  { name: 'Cornea Specialist Visit Copay', category: 'doctor_visit', price: 50.0 },
];

export const CostTracker: React.FC<CostTrackerProps> = ({
  expenses,
  onSaveExpense,
  onDeleteExpense,
  soundEnabled = true,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);

  // Form states
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [productName, setProductName] = useState<string>('');
  const [category, setCategory] = useState<ExpenseItem['category']>('ointment');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [store, setStore] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Open modal for editing
  const handleEdit = (item: ExpenseItem) => {
    setEditingItem(item);
    setDate(item.date);
    setProductName(item.productName);
    setCategory(item.category);
    setPrice(item.price.toString());
    setQuantity(item.quantity || 1);
    setStore(item.store || '');
    setNotes(item.notes || '');
    setShowAddModal(true);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDate(new Date().toISOString().split('T')[0]);
    setProductName('');
    setCategory('ointment');
    setPrice('');
    setQuantity(1);
    setStore('');
    setNotes('');
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) return;

    const item: ExpenseItem = {
      id: editingItem ? editingItem.id : `exp_${Date.now()}`,
      date,
      productName: productName.trim() || 'Eye Lubricant',
      category,
      price: parsedPrice,
      quantity: quantity > 0 ? quantity : 1,
      store: store.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (soundEnabled) sound.playGentleBeep(520, 0.1);
    onSaveExpense(item);
    setShowAddModal(false);
  };

  // Calculations
  const stats = useMemo(() => {
    const totalSpent = expenses.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

    // Current month spend
    const currentYearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthExpenses = expenses.filter((item) => item.date.startsWith(currentYearMonth));
    const currentMonthSpent = currentMonthExpenses.reduce(
      (sum, item) => sum + item.price * (item.quantity || 1),
      0
    );

    // Current year spend
    const currentYear = new Date().getFullYear().toString();
    const currentYearExpenses = expenses.filter((item) => item.date.startsWith(currentYear));
    const currentYearSpent = currentYearExpenses.reduce(
      (sum, item) => sum + item.price * (item.quantity || 1),
      0
    );

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((item) => {
      const cat = item.category || 'other';
      const cost = item.price * (item.quantity || 1);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + cost;
    });

    // Monthly breakdown for mini bar chart
    const monthsMap = new Map<string, number>();
    expenses.forEach((item) => {
      const m = item.date.slice(0, 7);
      const cost = item.price * (item.quantity || 1);
      monthsMap.set(m, (monthsMap.get(m) || 0) + cost);
    });

    const monthlyTrend = Array.from(monthsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6); // last 6 recorded months

    return {
      totalSpent,
      currentMonthSpent,
      currentYearSpent,
      categoryTotals,
      monthlyTrend,
    };
  }, [expenses]);

  // Sorted expenses descending
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);

  const maxMonthSpend = Math.max(...stats.monthlyTrend.map((m) => m[1]), 50);

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 sm:px-0">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Eye Care Cost Tracker</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log drops, gels, ointments, goggles & copays
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          <span>Log Purchase</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            This Month
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ${stats.currentMonthSpent.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Active month's lubrication spend
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Year-to-Date
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
            ${stats.currentYearSpent.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Annual out-of-pocket costs
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Logged
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ${stats.totalSpent.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Across {expenses.length} purchases
          </div>
        </div>
      </div>

      {/* Spend by Month Chart */}
      {stats.monthlyTrend.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Monthly Spend Trend</span>
          </h3>

          <div className="pt-4 pb-1">
            <div className="h-32 flex items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-2">
              {stats.monthlyTrend.map(([monthStr, cost]) => {
                const heightPct = (cost / maxMonthSpend) * 100;
                const monthName = new Date(`${monthStr}-01T12:00:00`).toLocaleDateString([], {
                  month: 'short',
                });

                return (
                  <div key={monthStr} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 z-20 whitespace-nowrap">
                      ${cost.toFixed(2)}
                    </div>

                    <div
                      style={{ height: `${Math.max(heightPct, 8)}%` }}
                      className="w-full max-w-[28px] rounded-t-lg bg-emerald-500 dark:bg-emerald-600 transition-all flex items-end justify-center pb-1"
                    >
                      <span className="text-[9px] font-bold text-white leading-none">
                        ${Math.round(cost)}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-slate-400 mt-2">
                      {monthName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Spend by Category</span>
        </h3>

        <div className="space-y-2 pt-1">
          {CATEGORIES.map((cat) => {
            const amount = stats.categoryTotals[cat.id] || 0;
            const pct = stats.totalSpent > 0 ? Math.round((amount / stats.totalSpent) * 100) : 0;
            if (amount === 0) return null;

            return (
              <div key={cat.id}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">{cat.label}</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    ${amount.toFixed(2)} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full bg-teal-600 dark:bg-teal-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchases List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Purchase History ({expenses.length})</span>
          </h3>
        </div>

        {sortedExpenses.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No purchases logged yet. Tap "Log Purchase" above.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedExpenses.map((item) => {
              const catObj = CATEGORIES.find((c) => c.id === item.category);
              const totalItemPrice = item.price * (item.quantity || 1);

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.productName}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{item.date}</span>
                      <span>•</span>
                      <span>{catObj?.label || item.category}</span>
                      {item.store && (
                        <>
                          <span>•</span>
                          <span>{item.store}</span>
                        </>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-slate-400 italic mt-0.5 truncate">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        ${totalItemPrice.toFixed(2)}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-[10px] text-slate-400">
                          ${item.price.toFixed(2)} ea
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this purchase record?')) onDeleteExpense(item.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>{editingItem ? 'Edit Purchase' : 'Log Eye Care Purchase'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick autocomplete chips */}
            {!editingItem && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
                  Popular EBMD Supplies:
                </label>
                <div className="flex flex-wrap gap-1">
                  {QUICK_PRODUCTS.map((qp) => (
                    <button
                      key={qp.name}
                      type="button"
                      onClick={() => {
                        setProductName(qp.name);
                        setCategory(qp.category as any);
                        setPrice(qp.price.toString());
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700 transition"
                    >
                      {qp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Product / Supply Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muro 128 5% Ointment"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="28.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Store / Pharmacy (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Walgreens, Amazon, Eye Clinic"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2-pack discount, lasts ~2 months"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Update Purchase' : 'Save Purchase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
