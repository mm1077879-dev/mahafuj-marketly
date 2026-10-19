import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectAllOrders } from '../../store/slices/orderSlice';
import { Users, Mail, Phone, MapPin } from 'lucide-react';

const mockCustomersList = [
  {
    id: 'usr_cust_2',
    name: 'Emily Johnson',
    email: 'emily.johnson@example.com',
    phone: '+880 1819-987654',
    division: 'Chittagong',
    ordersCount: 2,
    totalSpent: 289.97,
    joinedAt: '2026-01-10',
  },
  {
    id: 'usr_cust_3',
    name: 'Tanvir Ahmed',
    email: 'tanvir.ahmed@example.com',
    phone: '+880 1712-445566',
    division: 'Dhaka',
    ordersCount: 3,
    totalSpent: 1249.98,
    joinedAt: '2026-01-18',
  },
  {
    id: 'usr_cust_4',
    name: 'Sarah Miller',
    email: 'sarah.miller@example.com',
    phone: '+880 1911-223344',
    division: 'Sylhet',
    ordersCount: 1,
    totalSpent: 69.99,
    joinedAt: '2026-02-04',
  },
];

export const AdminCustomersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Customer Directory & Accounts
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Registered customer profiles, historical purchase volume, and Bangladesh delivery hubs.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Hub Division</th>
                <th className="p-4">Orders Placed</th>
                <th className="p-4">Total Value</th>
                <th className="p-4 text-right">Member Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {mockCustomersList.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      {c.name[0]}
                    </div>
                    <span>{c.name}</span>
                  </td>
                  <td className="p-4 space-y-0.5">
                    <p className="text-slate-800">{c.email}</p>
                    <p className="text-[10px] text-slate-400">{c.phone}</p>
                  </td>
                  <td className="p-4 font-medium text-slate-700">{c.division} Division</td>
                  <td className="p-4 font-bold text-blue-600 tabular-nums">{c.ordersCount} orders</td>
                  <td className="p-4 font-black text-slate-900 tabular-nums">${c.totalSpent.toFixed(2)}</td>
                  <td className="p-4 text-right text-slate-400">{c.joinedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
