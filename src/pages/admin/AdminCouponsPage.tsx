import React, { useState } from 'react';
import { Tag, Plus, CheckCircle2, Trash2 } from 'lucide-react';

interface CouponItem {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrder: number;
  timesUsed: number;
  active: boolean;
}

const initialCoupons: CouponItem[] = [
  {
    id: 'c1',
    code: 'SUMMER60',
    discountType: 'percentage',
    discountValue: 20,
    minOrder: 49,
    timesUsed: 142,
    active: true,
  },
  {
    id: 'c2',
    code: 'MARKETLY20',
    discountType: 'percentage',
    discountValue: 20,
    minOrder: 50,
    timesUsed: 89,
    active: true,
  },
  {
    id: 'c3',
    code: 'SAVE10',
    discountType: 'fixed',
    discountValue: 10,
    minOrder: 70,
    timesUsed: 64,
    active: true,
  },
];

export const AdminCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponItem[]>(initialCoupons);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState(15);
  const [minOrder, setMinOrder] = useState(50);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const newCoupon: CouponItem = {
      id: 'cp_' + Date.now(),
      code: code.trim().toUpperCase(),
      discountType: type,
      discountValue: Number(value),
      minOrder: Number(minOrder),
      timesUsed: 0,
      active: true,
    };
    setCoupons([newCoupon, ...coupons]);
    setCode('');
  };

  const handleDelete = (id: string) => {
    setCoupons(coupons.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Promotion Coupons & Discount Codes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Server-validated promotional codes applicable during cart & checkout calculations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Create form */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Generate Coupon</span>
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. LUXURY15"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Value</label>
                <input
                  type="number"
                  required
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min. Order Value ($)</label>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Issue Coupon
            </button>
          </form>
        </div>

        {/* Coupons List */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            Active Discount Coupons ({coupons.length})
          </h2>

          <div className="space-y-3">
            {coupons.map((cp) => (
              <div
                key={cp.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-base text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {cp.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                      {cp.discountType === 'percentage' ? `${cp.discountValue}% OFF` : `$${cp.discountValue} OFF`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Min order ${cp.minOrder} · Used {cp.timesUsed} times
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(cp.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
