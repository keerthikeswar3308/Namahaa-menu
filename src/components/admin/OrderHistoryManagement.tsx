'use client';

import React, { useState, useEffect } from 'react';
import { DailyOrderSummary, Order } from '@/types';
import { OrderStore } from '@/lib/orderStore';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Search,
  Clock,
  Utensils,
  X,
  Printer,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const OrderHistoryManagement: React.FC = () => {
  const [historyList, setHistoryList] = useState<DailyOrderSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  // Dedicated Selected Date View State
  const [selectedDateSummary, setSelectedDateSummary] = useState<DailyOrderSummary | null>(null);
  const [dateOrders, setDateOrders] = useState<Order[]>([]);
  const [isLoadingDateDetails, setIsLoadingDateDetails] = useState<boolean>(false);

  // Dedicated Selected Order Detail View Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadHistoryList = async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const list = await OrderStore.fetchHistoryList();
      setHistoryList(list);
    } catch (err: any) {
      console.error('loadHistoryList error:', err);
      setListError(err.message || 'Failed to load order history list');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadHistoryList();
  }, []);

  const handleOpenDate = async (summary: DailyOrderSummary) => {
    setSelectedDateSummary(summary);
    setIsLoadingDateDetails(true);
    try {
      const data = await OrderStore.fetchDailyDetails(summary.date);
      setDateOrders(data.orders);
    } catch (err) {
      console.error('handleOpenDate error:', err);
    } finally {
      setIsLoadingDateDetails(false);
    }
  };

  const handlePrintKot = (order: Order) => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      alert('Pop-up blocker is active. Please enable pop-ups.');
      return;
    }
    const itemsHtml = order.items
      .map((item) => `<tr><td style="font-size: 16px; font-weight: bold; padding: 6px 0; font-family: monospace;">${item.quantity} x ${item.name.toUpperCase()}</td></tr>`)
      .join('');
    const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    printWindow.document.write(`
      <html>
        <head>
          <title></title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { font-family: system-ui, -apple-system, sans-serif; color: #000; margin: 0; padding: 10px; width: 280px; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div><strong>Order #:</strong> ${order.orderNumber}<br/><strong>Table #:</strong> ${order.tableNumber}<br/><strong>Time:</strong> ${formattedTime}</div>
          <hr/>
          <table>${itemsHtml}</table>
          <hr/>
          ${order.notes ? `<div><strong>Notes:</strong> "${order.notes}"</div><hr/>` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredHistory = historyList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.formattedDate.toLowerCase().includes(q) ||
      item.date.includes(q) ||
      item.orderCount.toString().includes(q)
    );
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1 text-namaha-gold text-xs uppercase font-extrabold tracking-widest">
            <Calendar className="w-4 h-4" /> Past Daily Records
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-namaha-green-deep dark:text-white">
            ORDER HISTORY
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Compact daily sales logs. Click any past date to expand complete order records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search past date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-full bg-white dark:bg-namaha-green-dark border border-emerald-950/10 dark:border-namaha-gold/20 text-xs text-slate-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
            />
          </div>

          <button
            onClick={loadHistoryList}
            disabled={isLoadingList}
            className="p-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingList ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {listError && (
        <div className="p-6 text-center bg-red-950/50 border border-red-500 rounded-3xl text-red-300">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
          <h4 className="font-bold text-sm">UNABLE TO LOAD ORDER HISTORY</h4>
          <p className="text-xs text-red-300/80 mb-3">{listError}</p>
          <button
            onClick={loadHistoryList}
            className="px-4 py-1.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold text-xs"
          >
            RETRY
          </button>
        </div>
      )}

      {/* COMPACT DAILY LIST TABLE / CARDS */}
      {!selectedDateSummary ? (
        <div className="bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-namaha-green-dark/60 border-b border-gray-100 dark:border-white/10 hidden sm:flex items-center justify-between text-xs font-extrabold text-slate-500 dark:text-namaha-gold uppercase tracking-wider">
            <span className="w-1/3">DATE</span>
            <span className="w-1/4 text-center">ORDERS</span>
            <span className="w-1/4 text-right">ORDER VALUE</span>
            <span className="w-12 text-right"></span>
          </div>

          {isLoadingList ? (
            <div className="p-12 text-center text-slate-500 dark:text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
              <span>Loading order history logs...</span>
            </div>
          ) : filteredHistory.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {filteredHistory.map((day) => (
                <button
                  key={day.date}
                  onClick={() => handleOpenDate(day)}
                  className="w-full p-4 flex items-center justify-between hover:bg-amber-500/10 transition text-left group"
                >
                  <div className="flex items-center gap-3 w-full sm:w-1/3">
                    <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div>
                      <span className="font-extrabold text-sm text-slate-800 dark:text-white block group-hover:text-amber-500">
                        {day.formattedDate || day.date}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium sm:hidden">
                        {day.orderCount} orders • ₹{day.totalOrderValue.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:block w-1/4 text-center font-bold text-sm text-slate-700 dark:text-gray-300">
                    {day.orderCount} Orders
                  </div>

                  <div className="hidden sm:block w-1/4 text-right font-serif font-extrabold text-base text-namaha-green-deep dark:text-namaha-gold">
                    ₹{day.totalOrderValue.toFixed(0)}
                  </div>

                  <div className="w-12 text-right">
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-1 transition ml-auto" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 dark:text-gray-400">
              <Utensils className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white">NO HISTORY RECORDS FOUND</h3>
              <p className="text-xs">No previous day order logs match your search.</p>
            </div>
          )}
        </div>
      ) : (
        /* EXPANDED DETAILED DAILY VIEW */
        <div className="space-y-6 animate-fade-in">
          {/* Back Button & Top Date Summary */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-namaha-green-dark to-slate-900 border border-namaha-gold/30 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedDateSummary(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Order History List</span>
              </button>

              <span className="text-xs font-extrabold text-namaha-gold uppercase tracking-wider">
                {selectedDateSummary.formattedDate}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <span className="text-xs text-gray-300 block font-semibold">TOTAL ORDERS</span>
                <span className="text-2xl font-serif font-extrabold text-white">{selectedDateSummary.orderCount}</span>
              </div>

              <div>
                <span className="text-xs text-gray-300 block font-semibold">TOTAL ITEMS</span>
                <span className="text-2xl font-serif font-extrabold text-white">{selectedDateSummary.itemCount}</span>
              </div>

              <div>
                <span className="text-xs text-gray-300 block font-semibold">ORDER VALUE</span>
                <span className="text-2xl font-serif font-extrabold text-namaha-gold">₹{selectedDateSummary.totalOrderValue.toFixed(0)}</span>
              </div>

              <div>
                <span className="text-xs text-gray-300 block font-semibold">AVG ORDER VALUE</span>
                <span className="text-2xl font-serif font-extrabold text-emerald-400">₹{selectedDateSummary.averageOrderValue.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Orders for Selected Date */}
          <div className="bg-white dark:bg-namaha-green-deep border border-emerald-950/10 dark:border-namaha-gold/20 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-namaha-green-dark/60 border-b border-gray-100 dark:border-white/10 flex items-center justify-between text-xs font-extrabold text-slate-500 dark:text-namaha-gold uppercase tracking-wider">
              <span>INDIVIDUAL ORDERS FOR {selectedDateSummary.formattedDate}</span>
              <span>{dateOrders.length} Records</span>
            </div>

            {isLoadingDateDetails ? (
              <div className="p-12 text-center text-slate-500 dark:text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
                <span>Loading day orders...</span>
              </div>
            ) : dateOrders.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {dateOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className="p-4 flex items-center justify-between hover:bg-amber-500/10 transition cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-white group-hover:text-amber-500">
                          {ord.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          TABLE #{ord.tableNumber}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {ord.items.length} items
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-serif font-extrabold text-base text-namaha-green-deep dark:text-namaha-gold">
                        ₹{ord.totalAmount.toFixed(0)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-500" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-gray-400 text-xs">
                No order details recorded for this date.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SINGLE ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-namaha-green-deep border border-emerald-950/20 dark:border-namaha-gold/30 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white hover:bg-gray-200 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-gray-100 dark:border-white/10 pb-3 mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-namaha-gold">
                HISTORICAL ORDER DETAIL
              </span>
              <h3 className="text-xl font-serif font-bold text-namaha-green-deep dark:text-white">
                {selectedOrder.orderNumber}
              </h3>
              <div className="text-xs text-gray-400 font-medium flex items-center justify-between mt-1">
                <span>Table #{selectedOrder.tableNumber}</span>
                <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
              {selectedOrder.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-800 dark:text-white">
                    {it.quantity}x {it.name}
                  </span>
                  <span className="font-semibold text-slate-600 dark:text-gray-300">
                    ₹{(it.price * it.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {selectedOrder.notes && (
              <div className="p-3 rounded-2xl bg-amber-500/10 text-xs italic text-amber-900 dark:text-amber-300 mb-4 font-medium">
                &quot;{selectedOrder.notes}&quot;
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block font-semibold">TOTAL ORDER VALUE</span>
                <span className="text-xl font-serif font-extrabold text-namaha-green-deep dark:text-namaha-gold">
                  ₹{selectedOrder.totalAmount.toFixed(2)}
                </span>
              </div>

              <button
                onClick={() => handlePrintKot(selectedOrder)}
                className="py-2 px-3 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" /> PRINT KOT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
