'use client';

import React from 'react';
import { Order } from '@/types';
import { Printer, X, Check, Utensils, FileText } from 'lucide-react';

interface ThermalPrinterModalProps {
  order: Order;
  type: 'kot' | 'bill';
  onClose: () => void;
}

export const ThermalPrinterModal: React.FC<ThermalPrinterModalProps> = ({
  order,
  type,
  onClose,
}) => {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const isKot = type === 'kot';

  // Calculate items total quantity
  const totalUnits = order.items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      {/* Screen Controls & Preview Box */}
      <div className="relative w-full max-w-md bg-namaha-green-dark border-2 border-namaha-gold/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-namaha-green-deep flex-shrink-0">
          <div className="flex items-center gap-2 text-namaha-gold font-bold text-base">
            <Printer className="w-5 h-5" />
            <span>{isKot ? 'Kitchen Order Slip (KOT)' : 'Customer Bill Receipt'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-black/40 border-b border-white/10 flex items-center justify-between flex-shrink-0 gap-3">
          <div className="text-xs text-gray-300">
            Previewing <strong className="text-namaha-gold">{isKot ? 'KOT Slip' : 'Bill Receipt'}</strong>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-namaha-gold text-namaha-green-deep font-extrabold text-xs shadow-lg hover:bg-amber-400 active:scale-95 transition"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT SLIP NOW</span>
          </button>
        </div>

        {/* Print Slip Container (Scrollable Preview on screen) */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-900 flex justify-center">
          {/* Printable Receipt Paper Surface (76mm / 3 inch width) */}
          <div
            id="thermal-print-area"
            className="w-[280px] bg-white text-black p-4 font-mono text-[12px] leading-tight shadow-2xl rounded-sm selection:bg-gray-200"
          >
            {/* Restaurant Header (Only for Customer Bills) */}
            {!isKot && (
              <div className="text-center border-b border-dashed border-black pb-2 mb-2 space-y-1">
                <h2 className="text-base font-extrabold tracking-wider uppercase">NAMA HAA TIFFIN ROOM</h2>
                <p className="text-[10px] text-gray-700">Authentic South Indian Tiffins</p>
                <div className="pt-1 font-bold text-xs uppercase bg-black text-white py-0.5 px-1 rounded-sm mt-1">
                  *** CUSTOMER BILL RECEIPT ***
                </div>
              </div>
            )}

            {/* Slip Meta Info */}
            <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>ORDER: {order.orderNumber}</span>
                <span>TABLE #: {order.tableNumber}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-800">
                <span>DATE: {new Date(order.createdAt).toLocaleDateString()}</span>
                <span>TIME: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {order.customerName && (
                <div className="text-[10px]">CUST: {order.customerName}</div>
              )}
            </div>

            {/* Items Table */}
            {isKot ? (
              /* KITCHEN SLIP ITEMS */
              <div className="border-b border-dashed border-black pb-2 mb-2">
                <div className="flex font-bold border-b border-black pb-1 mb-1 text-[11px]">
                  <span className="w-8 text-center">QTY</span>
                  <span className="flex-1">ITEM NAME</span>
                </div>
                {order.items.map((item, idx) => (
                  <div key={idx} className="mb-1.5">
                    <div className="flex font-bold text-[12px]">
                      <span className="w-8 text-center text-sm font-extrabold">{item.quantity}x</span>
                      <span className="flex-1">{item.name}</span>
                    </div>
                    {item.notes && (
                      <div className="pl-8 text-[10px] italic text-gray-800">
                        * Note: {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* CUSTOMER BILL ITEMS */
              <div className="border-b border-dashed border-black pb-2 mb-2">
                <div className="flex font-bold border-b border-black pb-1 mb-1 text-[11px]">
                  <span className="flex-1">ITEM</span>
                  <span className="w-8 text-center">QTY</span>
                  <span className="w-14 text-right">PRICE</span>
                  <span className="w-14 text-right">AMT</span>
                </div>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex text-[11px] py-0.5">
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <span className="w-14 text-right">₹{item.price.toFixed(0)}</span>
                    <span className="w-14 text-right font-bold">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Total Section */}
            {isKot ? (
              <div className="border-b border-dashed border-black pb-2 mb-2 text-center">
                <div className="font-extrabold text-sm">TOTAL UNITS: {totalUnits} ITEMS</div>
                {order.notes && (
                  <div className="mt-2 text-left p-1.5 bg-gray-100 border border-gray-300 rounded text-[10px]">
                    <strong>KITCHEN NOTE:</strong> {order.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-b border-dashed border-black pb-2 mb-2 space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>SUBTOTAL:</span>
                  <span>₹{order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-extrabold border-t border-black pt-1">
                  <span>GRAND TOTAL:</span>
                  <span>₹{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-1 text-[10px] space-y-0.5">
              <div className="font-bold">{isKot ? 'COOK FRESH & SERVE HOT' : 'THANK YOU! VISIT AGAIN!'}</div>
              <div className="text-[9px] text-gray-600">NAMA HAA TIFFIN ROOM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Clean Thermal Printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-print-area, #thermal-print-area * {
            visibility: visible !important;
          }
          #thermal-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 76mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  );
};
