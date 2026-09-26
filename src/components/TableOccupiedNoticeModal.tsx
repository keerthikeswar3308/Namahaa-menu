'use client';

import React from 'react';
import { AlertTriangle, Users, Globe, X } from 'lucide-react';

interface TableOccupiedNoticeModalProps {
  isOpen: boolean;
  tableNumber: number;
  onJoinGroup: () => void;
  onBrowseGeneral: () => void;
  onClose?: () => void;
}

export const TableOccupiedNoticeModal: React.FC<TableOccupiedNoticeModalProps> = ({
  isOpen,
  tableNumber,
  onJoinGroup,
  onBrowseGeneral,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-namaha-green-deep border-2 border-red-500/50 rounded-3xl p-6 shadow-2xl text-white space-y-6">
        
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Warning Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 font-serif font-bold text-xs">
            Notice: Table #{tableNumber} Already Occupied
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
            Table #{tableNumber} Has an Active Session
          </h2>

          <p className="text-sm text-gray-300 leading-relaxed max-w-xs">
            Sorry, <strong className="text-red-400">Table #{tableNumber}</strong> already has an active order or dining session in progress. Please check with your server or join the table group.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onJoinGroup}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-namaha-gold via-amber-400 to-namaha-gold text-namaha-green-deep font-bold text-sm sm:text-base hover:brightness-110 active:scale-98 transition shadow-lg flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            <span>👥 Join Table #{tableNumber} Group Cart</span>
          </button>

          <button
            onClick={onBrowseGeneral}
            className="w-full py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>🌐 Browse General Takeaway Menu</span>
          </button>
        </div>

        <p className="text-[11px] text-gray-400 text-center italic">
          If you need a new table assigned, please ask a staff member.
        </p>

      </div>
    </div>
  );
};
