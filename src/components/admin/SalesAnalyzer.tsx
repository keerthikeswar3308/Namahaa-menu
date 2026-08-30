'use client';

import React, { useState, useEffect } from 'react';
import { SalesAnalytics } from '@/types';
import { OrderStore } from '@/lib/orderStore';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign,
  ShoppingBag,
  Clock,
  PieChart,
  Users,
  Download,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from 'lucide-react';

export const SalesAnalyzer: React.FC = () => {
  const [range, setRange] = useState<string>('last_7_days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [itemSortKey, setItemSortKey] = useState<'quantity' | 'value'>('quantity');

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await OrderStore.fetchSalesAnalytics(range, customStartDate, customEndDate);
      if (data) {
        setAnalytics(data);
      } else {
        setError('Failed to compute sales analytics data.');
      }
    } catch (err: any) {
      console.error('loadAnalytics error:', err);
      setError(err.message || 'Error fetching analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (range !== 'custom') {
      loadAnalytics();
    }
  }, [range]);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) {
      alert('Please select both start date and end date.');
      return;
    }
    loadAnalytics();
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    try {
      const headers = ['Date', 'Order Number', 'Table Number', 'Items Count', 'Order Value (INR)'];
      const rows: string[][] = [headers];

      analytics.dailyTrend.forEach((day) => {
        rows.push([
          day.date,
          `Summary ${day.formattedDate}`,
          '-',
          day.orderCount.toString(),
          day.totalValue.toFixed(2),
        ]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Sales_Report_${analytics.dateRangeLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV Export error:', err);
      alert('Failed to generate CSV export.');
    }
  };

  const sortedTopItems = React.useMemo(() => {
    if (!analytics || !analytics.topSellingItems) return [];
    const list = [...analytics.topSellingItems];
    if (itemSortKey === 'value') {
      return list.sort((a, b) => b.totalValue - a.totalValue);
    }
    return list.sort((a, b) => b.quantitySold - a.quantitySold);
  }, [analytics, itemSortKey]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & Range Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1 text-namaha-gold text-xs uppercase font-extrabold tracking-widest">
            <BarChart3 className="w-4 h-4 text-namaha-gold" /> Business Intelligence & Sales Performance
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-namaha-green-deep dark:text-white">
            SALES ANALYZER
          </h2>
          {analytics && (
            <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
              Period: {analytics.dateRangeLabel}
            </span>
          )}
        </div>

        {/* Range Buttons & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'TODAY' },
            { id: 'yesterday', label: 'YESTERDAY' },
            { id: 'last_7_days', label: 'LAST 7 DAYS' },
            { id: 'last_30_days', label: 'LAST 30 DAYS' },
            { id: 'this_month', label: 'THIS MONTH' },
            { id: 'custom', label: 'CUSTOM RANGE' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setRange(btn.id)}
              className={`px-3 py-1.5 rounded-2xl font-extrabold text-xs transition ${
                range === btn.id
                  ? 'bg-namaha-gold text-namaha-green-deep shadow-md'
                  : 'bg-white dark:bg-namaha-green-dark border border-gray-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-namaha-gold/20'
              }`}
            >
              {btn.label}
            </button>
          ))}

          <button
            onClick={handleExportCSV}
            disabled={!analytics || isLoading}
            className="px-3 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
            title="Export CSV sales report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>

          <button
            onClick={loadAnalytics}
            disabled={isLoading}
            className="p-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Form */}
      {range === 'custom' && (
        <form onSubmit={handleApplyCustom} className="p-5 rounded-3xl bg-namaha-green-dark border-2 border-namaha-gold/50 flex flex-wrap items-center gap-4 text-xs shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-namaha-gold text-xs uppercase tracking-wider">Start Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-4 py-2 rounded-2xl bg-black/60 border border-namaha-gold/40 text-amber-300 font-extrabold text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-namaha-gold cursor-pointer"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-namaha-gold text-xs uppercase tracking-wider">End Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-4 py-2 rounded-2xl bg-black/60 border border-namaha-gold/40 text-amber-300 font-extrabold text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-namaha-gold cursor-pointer"
              required
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-namaha-green-deep font-extrabold shadow-namaha-gold transition cursor-pointer"
          >
            APPLY RANGE
          </button>
        </form>
      )}


      {/* Error state */}
      {error && (
        <div className="p-6 text-center bg-red-950/50 border border-red-500 rounded-3xl text-red-300">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <h4 className="font-bold text-sm">UNABLE TO LOAD SALES DATA</h4>
          <p className="text-xs text-red-300/80 mb-3">{error}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-1.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs"
          >
            RETRY
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-slate-500 dark:text-gray-400">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3 text-namaha-gold" />
          <span className="font-serif font-bold text-lg">Analyzing Sales & Performance Data...</span>
        </div>
      ) : analytics ? (
        <div className="space-y-8">
          
          {/* MAIN KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: TOTAL ORDER VALUE */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-namaha-green-dark to-slate-900 border border-namaha-gold/30 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-namaha-gold">
                  TOTAL ORDER VALUE
                </span>
                <DollarSign className="w-5 h-5 text-namaha-gold" />
              </div>
              <div className="text-3xl font-serif font-extrabold text-white">
                ₹{analytics.totalOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              {analytics.valueChangePercentage !== undefined && analytics.valueChangePercentage !== 0 && (
                <div className="flex items-center gap-1 text-[11px] font-bold mt-2">
                  {analytics.valueChangePercentage > 0 ? (
                    <span className="text-emerald-400 flex items-center">
                      <ArrowUpRight className="w-3.5 h-3.5" /> +{analytics.valueChangePercentage.toFixed(1)}% vs prev period
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center">
                      <ArrowDownRight className="w-3.5 h-3.5" /> {analytics.valueChangePercentage.toFixed(1)}% vs prev period
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* KPI 2: TOTAL ORDERS */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-namaha-green-dark to-slate-900 border border-amber-500/30 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  TOTAL ORDERS
                </span>
                <ShoppingBag className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-serif font-extrabold text-white">
                {analytics.totalOrders}
              </div>
              {analytics.ordersChangePercentage !== undefined && analytics.ordersChangePercentage !== 0 && (
                <div className="flex items-center gap-1 text-[11px] font-bold mt-2">
                  {analytics.ordersChangePercentage > 0 ? (
                    <span className="text-emerald-400 flex items-center">
                      <ArrowUpRight className="w-3.5 h-3.5" /> +{analytics.ordersChangePercentage.toFixed(1)}% vs prev period
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center">
                      <ArrowDownRight className="w-3.5 h-3.5" /> {analytics.ordersChangePercentage.toFixed(1)}% vs prev period
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* KPI 3: AVERAGE ORDER VALUE */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-namaha-green-dark to-slate-900 border border-purple-500/30 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">
                  AVG ORDER VALUE
                </span>
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-serif font-extrabold text-white">
                ₹{analytics.averageOrderValue.toFixed(0)}
              </div>
              <span className="text-[11px] text-gray-400 block mt-2 font-medium">Per completed ticket</span>
            </div>

            {/* KPI 4: ITEMS SOLD */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-namaha-green-dark to-slate-900 border border-teal-500/30 text-white shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-teal-400">
                  ITEMS SOLD
                </span>
                <BarChart3 className="w-5 h-5 text-teal-400" />
              </div>
              <div className="text-3xl font-serif font-extrabold text-white">
                {analytics.totalItemsSold}
              </div>
              <span className="text-[11px] text-gray-400 block mt-2 font-medium">Food & Beverage volume</span>
            </div>
          </div>

          {/* BUSINESS INSIGHTS */}
          {analytics.insights && analytics.insights.length > 0 && (
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-white space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-amber-700 dark:text-namaha-gold tracking-widest">
                <Sparkles className="w-4 h-4 text-namaha-gold" /> BUSINESS INSIGHTS
              </div>
              <ul className="space-y-1 text-xs font-medium list-disc list-inside text-slate-700 dark:text-gray-300">
                {analytics.insights.map((ins, idx) => (
                  <li key={idx}>{ins}</li>
                ))}
              </ul>
            </div>
          )}

          {/* SALES & ORDERS TREND BAR CHART */}
          <div className="p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-namaha-green-deep dark:text-white">
                  SALES TREND
                </h3>
                <span className="text-xs text-slate-500 dark:text-gray-400">
                  Order value distribution for {analytics.dateRangeLabel}
                </span>
              </div>
            </div>

            {/* Visual CSS Bar Chart */}
            <div className="pt-4 pb-2">
              {analytics.dailyTrend.length > 0 ? (
                <div className="flex items-end gap-2 h-44 overflow-x-auto pb-4">
                  {analytics.dailyTrend.map((d, idx) => {
                    const maxVal = Math.max(...analytics.dailyTrend.map((t) => t.totalValue), 1);
                    const pct = Math.round((d.totalValue / maxVal) * 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center min-w-[44px] group">
                        <span className="text-[10px] font-bold text-namaha-gold mb-1 opacity-0 group-hover:opacity-100 transition">
                          ₹{d.totalValue.toFixed(0)}
                        </span>
                        <div
                          style={{ height: `${Math.max(pct, 6)}%` }}
                          className="w-full rounded-t-xl bg-gradient-to-t from-namaha-green-dark via-amber-500 to-namaha-gold shadow-md group-hover:brightness-125 transition"
                        />
                        <span className="text-[10px] font-extrabold text-slate-500 dark:text-gray-400 mt-2 truncate max-w-[48px]">
                          {d.formattedDate.split(' ')[0]} {d.formattedDate.split(' ')[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">No trend data recorded.</div>
              )}
            </div>
          </div>

          {/* TWO COLUMN SECTION: TOP SELLING ITEMS & CATEGORY BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* TOP SELLING ITEMS */}
            <div className="p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                <h3 className="text-lg font-serif font-bold text-namaha-green-deep dark:text-white">
                  TOP SELLING ITEMS
                </h3>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setItemSortKey('quantity')}
                    className={`px-2.5 py-1 rounded-xl font-bold transition ${
                      itemSortKey === 'quantity' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                    }`}
                  >
                    Qty
                  </button>
                  <button
                    onClick={() => setItemSortKey('value')}
                    className={`px-2.5 py-1 rounded-xl font-bold transition ${
                      itemSortKey === 'value' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                    }`}
                  >
                    Value
                  </button>
                </div>
              </div>

              {sortedTopItems.length > 0 ? (
                <div className="space-y-3">
                  {sortedTopItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-2xl bg-slate-50 dark:bg-namaha-green-dark/50">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-lg bg-namaha-gold/20 text-namaha-gold font-extrabold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-namaha-gold block">₹{item.totalValue.toFixed(0)}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{item.quantitySold} units sold</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-400">No item sales recorded.</div>
              )}
            </div>

            {/* CATEGORY PERFORMANCE */}
            <div className="p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl space-y-4">
              <div className="border-b border-gray-100 dark:border-white/10 pb-3">
                <h3 className="text-lg font-serif font-bold text-namaha-green-deep dark:text-white">
                  CATEGORY PERFORMANCE
                </h3>
                <span className="text-xs text-slate-500 dark:text-gray-400">Sales breakdown by menu categories</span>
              </div>

              {analytics.categorySales && analytics.categorySales.length > 0 ? (
                <div className="space-y-3">
                  {analytics.categorySales.map((cat, idx) => {
                    const totalCatVal = analytics.categorySales.reduce((s, c) => s + c.totalValue, 0) || 1;
                    const pct = Math.round((cat.totalValue / totalCatVal) * 100);
                    return (
                      <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-namaha-green-dark/50 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-white">{cat.categoryName}</span>
                          <span className="font-extrabold text-namaha-gold">₹{cat.totalValue.toFixed(0)} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                          <div style={{ width: `${pct}%` }} className="h-full bg-amber-500 rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-400">No category breakdown recorded.</div>
              )}
            </div>

          </div>

          {/* TWO COLUMN SECTION: HOURLY ANALYSIS & TABLE BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* HOURLY ANALYSIS & PEAK HOUR */}
            <div className="p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                <h3 className="text-lg font-serif font-bold text-namaha-green-deep dark:text-white">
                  HOURLY ANALYSIS
                </h3>
                {analytics.peakHour && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-namaha-gold" /> Peak: {analytics.peakHour.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {analytics.hourlySales.filter((h) => h.orderCount > 0).map((h, idx) => (
                  <div key={idx} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-namaha-green-dark/50 text-xs">
                    <span className="font-extrabold text-slate-700 dark:text-gray-300 block">{h.hourLabel}</span>
                    <span className="font-serif font-extrabold text-namaha-gold block">₹{h.totalValue.toFixed(0)}</span>
                    <span className="text-[10px] text-gray-400">{h.orderCount} orders</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ORDERS BY TABLE */}
            <div className="p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl space-y-4">
              <div className="border-b border-gray-100 dark:border-white/10 pb-3">
                <h3 className="text-lg font-serif font-bold text-namaha-green-deep dark:text-white">
                  ORDERS BY TABLE
                </h3>
                <span className="text-xs text-slate-500 dark:text-gray-400">Admin operational table demand analytics</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {analytics.tableSales.map((t, idx) => (
                  <div key={idx} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-namaha-green-dark/50 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-800 dark:text-white block">Table #{t.tableNumber}</span>
                      <span className="text-[10px] text-gray-400">{t.orderCount} orders</span>
                    </div>
                    <span className="font-serif font-extrabold text-namaha-gold">₹{t.totalValue.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* DAILY SUMMARY TABLE */}
          <div className="p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl space-y-4 overflow-x-auto">
            <h3 className="text-lg font-serif font-bold text-namaha-green-deep dark:text-white border-b border-gray-100 dark:border-white/10 pb-3">
              DAILY SUMMARY LOG
            </h3>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-gray-400 uppercase font-extrabold">
                  <th className="py-2 px-3">DATE</th>
                  <th className="py-2 px-3 text-center">ORDERS</th>
                  <th className="py-2 px-3 text-right">ORDER VALUE</th>
                  <th className="py-2 px-3 text-right">AVG ORDER VALUE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {analytics.dailyTrend.map((row, idx) => (
                  <tr key={idx} className="hover:bg-amber-500/10 transition">
                    <td className="py-2.5 px-3 font-extrabold text-slate-800 dark:text-white">{row.formattedDate}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-gray-300">{row.orderCount}</td>
                    <td className="py-2.5 px-3 text-right font-serif font-extrabold text-namaha-gold">₹{row.totalValue.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-gray-300">
                      ₹{(row.orderCount > 0 ? row.totalValue / row.orderCount : 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-namaha-green-deep rounded-3xl border border-emerald-950/10 dark:border-namaha-gold/20">
          <BarChart3 className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-serif font-bold text-slate-800 dark:text-white">NO SALES DATA</h3>
          <p className="text-xs text-gray-400">No customer orders were recorded during this date range.</p>
        </div>
      )}

    </div>
  );
};
