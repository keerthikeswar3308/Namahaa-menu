'use client';

import React from 'react';
import { generateQRMatrix } from '@/lib/qrGenerator';

interface QRCodeViewProps {
  value: string;
  size?: number;
  className?: string;
  tableNumber?: number;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 200,
  className = '',
  tableNumber,
}) => {
  const matrix = generateQRMatrix(value);
  const n = matrix.length;

  // Build SVG path
  let pathD = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        pathD += `M${c},${r}h1v1h-1z `;
      }
    }
  }

  return (
    <div className={`inline-flex flex-col items-center bg-white p-3 rounded-2xl shadow-md border border-slate-200 ${className}`}>
      <svg
        viewBox={`0 0 ${n} ${n}`}
        width={size}
        height={size}
        className="w-full h-auto max-w-full"
        shapeRendering="crispEdges"
      >
        {/* Background Quiet Zone */}
        <rect width={n} height={n} fill="#FFFFFF" />
        {/* Modules Path */}
        <path d={pathD} fill="#111827" />
      </svg>

      {tableNumber && (
        <span className="mt-2 text-xs font-bold text-slate-800 tracking-wider uppercase">
          Table #{tableNumber}
        </span>
      )}
    </div>
  );
};
