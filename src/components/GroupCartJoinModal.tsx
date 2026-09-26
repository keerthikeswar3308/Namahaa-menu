'use client';

import React from 'react';
import { Users, UserPlus, ShoppingBag, X } from 'lucide-react';

interface GroupCartJoinModalProps {
  isOpen: boolean;
  tableNumber: number;
  onJoinGroup: () => void;
  onSelectSeparate: () => void;
  onClose?: () => void;
}

export const GroupCartJoinModal: React.FC<GroupCartJoinModalProps> = ({
  isOpen,
  tableNumber,
  onJoinGroup,
  onSelectSeparate,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-namaha-green-deep border-2 border-namaha-gold/60 rounded-3xl p-6 shadow-2xl text-white space-y-6">
        
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-namaha-gold/20 border-2 border-namaha-gold flex items-center justify-center text-namaha-gold shadow-lg shadow-namaha-gold/20">
            <Users className="w-8 h-8 animate-bounce" />
          </div>

          <div className="inline-block px-3.5 py-1 rounded-full bg-namaha-gold/20 border border-namaha-gold/50 text-namaha-gold font-serif font-bold text-xs">
            📍 Table #{tableNumber} Active
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
            Table #{tableNumber} is Currently Active!
          </h2>

          <p className="text-sm text-gray-300 leading-relaxed max-w-xs">
            Items or orders have already been placed at <strong className="text-namaha-gold">Table #{tableNumber}</strong>. Are you dining together with this family or group?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onJoinGroup}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-namaha-gold via-amber-400 to-namaha-gold text-namaha-green-deep font-bold text-sm sm:text-base hover:brightness-110 active:scale-98 transition shadow-lg flex items-center justify-center gap-2 group"
          >
            <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>👥 Join Table #{tableNumber} Group Cart</span>
          </button>

          <button
            onClick={onSelectSeparate}
            className="w-full py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span>👤 I am an Individual (Separate Order)</span>
          </button>
        </div>

        <p className="text-[11px] text-gray-400 text-center italic">
          Joining the group lets you add items directly to Table #{tableNumber}'s shared cart in real-time.
        </p>

      </div>
    </div>
  );
};
