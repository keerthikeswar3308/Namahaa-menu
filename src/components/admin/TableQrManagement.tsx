'use client';

import React, { useState, useEffect } from 'react';
import { NamahaStore } from '@/lib/store';
import { QRCodeView } from '@/components/QRCodeView';
import { QrCode, Printer, Download, RefreshCw, Check, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';

export const TableQrManagement: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [tokensMap, setTokensMap] = useState<Record<number, string>>({});
  const [regenConfirmTable, setRegenConfirmTable] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [printableTable, setPrintableTable] = useState<number | 'all' | null>(null);
  const [copiedTokenTable, setCopiedTokenTable] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
      setTokensMap(NamahaStore.getTableTokensMap());
    }
  }, []);

  const handleRegenerate = async (tableNum: number) => {
    setIsRegenerating(true);
    try {
      const newToken = await NamahaStore.regenerateTableToken(tableNum);
      setTokensMap((prev) => ({ ...prev, [tableNum]: newToken }));
      setRegenConfirmTable(null);
    } catch (err: any) {
      alert(`Error regenerating QR code: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyLink = (tableNum: number, token: string) => {
    const fullUrl = `${baseUrl}/?t=${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedTokenTable(tableNum);
    setTimeout(() => setCopiedTokenTable(null), 2000);
  };

  const handlePrintPoster = (tableNum: number | 'all') => {
    const tablesToPrint = tableNum === 'all'
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : [tableNum];

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const posterCardsHtml = tablesToPrint.map((num) => {
      const token = tokensMap[num] || `namahaa_tbl${num}_default`;
      const fullUrl = `${baseUrl}/?t=${token}`;

      return `
        <div class="poster-card">
          <div class="header">
            <h1 class="brand">NAMAHAA TIFFIN ROOM</h1>
            <p class="tagline">Authentic South Indian Flavours • 100% Pure Veg</p>
          </div>
          <div class="table-badge">
            TABLE #${num}
          </div>
          <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fullUrl)}" alt="Table ${num} QR Code" />
          </div>
          <div class="instructions">
            <p class="scan-text">📷 SCAN WITH PHONE CAMERA TO ORDER</p>
            <p class="sub-text">No App Download Required • Select Dishes & Send directly to Kitchen</p>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Namahaa Restaurant Table QR Posters</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #000; margin: 0; padding: 0; }
          .poster-card {
            page-break-after: always;
            box-sizing: border-box;
            width: 100%;
            max-width: 550px;
            margin: 20px auto;
            border: 4px solid #15803d;
            border-radius: 24px;
            padding: 35px 25px;
            text-align: center;
            background: #fff;
          }
          .header { margin-bottom: 20px; }
          .brand { font-size: 28px; font-weight: 900; color: #15803d; margin: 0 0 5px 0; letter-spacing: 1px; }
          .tagline { font-size: 13px; font-weight: 700; color: #d97706; text-transform: uppercase; margin: 0; tracking: 0.5px; }
          .table-badge {
            display: inline-block;
            background: linear-gradient(135deg, #d97706, #f59e0b);
            color: #fff;
            font-size: 32px;
            font-weight: 900;
            padding: 10px 30px;
            border-radius: 50px;
            margin: 15px 0 25px 0;
            letter-spacing: 2px;
            box-shadow: 0 4px 10px rgba(217, 119, 6, 0.3);
          }
          .qr-container {
            margin: 0 auto 25px auto;
            width: 250px;
            height: 250px;
            padding: 15px;
            border: 3px solid #f59e0b;
            border-radius: 20px;
            background: #fff;
          }
          .qr-container img { width: 100%; height: 100%; object-fit: contain; }
          .instructions { border-top: 2px dashed #e5e7eb; padding-top: 20px; }
          .scan-text { font-size: 16px; font-weight: 800; color: #15803d; margin: 0 0 6px 0; }
          .sub-text { font-size: 12px; color: #4b5563; font-weight: 600; margin: 0; }
        </style>
      </head>
      <body onload="window.print(); setTimeout(() => window.close(), 600);">
        ${posterCardsHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPNG = (tableNum: number, token: string) => {
    const fullUrl = `${baseUrl}/?t=${token}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(fullUrl)}`;

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1250;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // 1. Background Fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1000, 1250);

      // Green Outer Border
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = 16;
      ctx.strokeRect(20, 20, 960, 1210);

      // Inner Gold Accent Line
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, 928, 1178);

      // 2. Brand Title
      ctx.fillStyle = '#15803D';
      ctx.font = '900 50px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NAMAHAA TIFFIN ROOM', 500, 115);

      // Tagline
      ctx.fillStyle = '#D97706';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('PURE VEGETARIAN SOUTH INDIAN', 500, 155);

      // 3. Prominent TABLE NUMBER Badge Mark
      const badgeW = 420;
      const badgeH = 95;
      const badgeX = 500 - badgeW / 2;
      const badgeY = 195;

      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 45);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();

      // Table Badge Text Mark
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 54px system-ui, -apple-system, sans-serif';
      ctx.fillText(`TABLE #${tableNum}`, 500, badgeY + 66);

      // 4. Draw QR Code with gold border
      const qrSize = 560;
      const qrX = 500 - qrSize / 2;
      const qrY = 330;

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30, 20);
      } else {
        ctx.rect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);
      }
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // 5. Instructions / Footer
      ctx.fillStyle = '#15803D';
      ctx.font = '900 30px system-ui, -apple-system, sans-serif';
      ctx.fillText('📷 SCAN WITH PHONE CAMERA TO ORDER', 500, 975);

      ctx.fillStyle = '#4B5563';
      ctx.font = '600 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('No App Download Required • Direct Kitchen Ordering', 500, 1025);

      // 6. Download PNG
      try {
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `Namahaa_Table_${tableNum}_QR_Poster.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        // Fallback if crossOrigin canvas taint occurs
        window.open(qrApiUrl, '_blank');
      }
    };

    img.onerror = () => {
      window.open(qrApiUrl, '_blank');
    };

    img.src = qrApiUrl;
  };

  const handlePrintGeneralPoster = () => {
    const fullUrl = `${baseUrl}/`;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const posterHtml = `
      <div class="poster-card">
        <div class="header">
          <h1 class="brand">NAMAHAA TIFFIN ROOM</h1>
          <p class="tagline">Authentic South Indian Flavours • 100% Pure Veg</p>
        </div>
        <div class="table-badge general-badge">
          SCAN TO VIEW MENU
        </div>
        <div class="qr-container">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fullUrl)}" alt="Namahaa General Menu QR Code" />
        </div>
        <div class="instructions">
          <p class="scan-text">📷 SCAN WITH PHONE CAMERA TO VIEW DIGITAL MENU</p>
          <p class="sub-text">Browse Full Digital Menu • Explore South Indian Tiffins & Beverages</p>
        </div>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Namahaa General Menu QR Poster</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #000; margin: 0; padding: 0; }
          .poster-card {
            box-sizing: border-box;
            width: 100%;
            max-width: 550px;
            margin: 20px auto;
            border: 4px solid #15803d;
            border-radius: 24px;
            padding: 35px 25px;
            text-align: center;
            background: #fff;
          }
          .header { margin-bottom: 20px; }
          .brand { font-size: 28px; font-weight: 900; color: #15803d; margin: 0 0 5px 0; letter-spacing: 1px; }
          .tagline { font-size: 13px; font-weight: 700; color: #d97706; text-transform: uppercase; margin: 0; tracking: 0.5px; }
          .table-badge {
            display: inline-block;
            background: linear-gradient(135deg, #15803d, #047857);
            color: #fff;
            font-size: 24px;
            font-weight: 900;
            padding: 10px 24px;
            border-radius: 50px;
            margin: 15px 0 25px 0;
            letter-spacing: 1px;
            box-shadow: 0 4px 10px rgba(21, 128, 61, 0.3);
          }
          .qr-container {
            margin: 0 auto 25px auto;
            width: 250px;
            height: 250px;
            padding: 15px;
            border: 3px solid #15803d;
            border-radius: 20px;
            background: #fff;
          }
          .qr-container img { width: 100%; height: 100%; object-fit: contain; }
          .instructions { border-top: 2px dashed #e5e7eb; padding-top: 20px; }
          .scan-text { font-size: 16px; font-weight: 800; color: #15803d; margin: 0 0 6px 0; }
          .sub-text { font-size: 12px; color: #4b5563; font-weight: 600; margin: 0; }
        </style>
      </head>
      <body onload="window.print(); setTimeout(() => window.close(), 600);">
        ${posterHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadGeneralPNG = () => {
    const fullUrl = `${baseUrl}/`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(fullUrl)}`;

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1250;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1000, 1250);

      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = 16;
      ctx.strokeRect(20, 20, 960, 1210);

      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, 928, 1178);

      ctx.fillStyle = '#15803D';
      ctx.font = '900 50px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NAMAHAA TIFFIN ROOM', 500, 115);

      ctx.fillStyle = '#D97706';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('PURE VEGETARIAN SOUTH INDIAN', 500, 155);

      const badgeW = 550;
      const badgeH = 95;
      const badgeX = 500 - badgeW / 2;
      const badgeY = 195;

      ctx.fillStyle = '#15803D';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 45);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 42px system-ui, -apple-system, sans-serif';
      ctx.fillText('SCAN TO VIEW MENU', 500, badgeY + 62);

      const qrSize = 560;
      const qrX = 500 - qrSize / 2;
      const qrY = 330;

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#15803D';
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30, 20);
      } else {
        ctx.rect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);
      }
      ctx.fill();
      ctx.stroke();

      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      ctx.fillStyle = '#15803D';
      ctx.font = '900 30px system-ui, -apple-system, sans-serif';
      ctx.fillText('📷 SCAN WITH PHONE CAMERA TO VIEW MENU', 500, 975);

      ctx.fillStyle = '#4B5563';
      ctx.font = '600 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('No App Download Required • View Digital Menu', 500, 1025);

      try {
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `Namahaa_General_Menu_QR_Poster.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        window.open(qrApiUrl, '_blank');
      }
    };

    img.onerror = () => {
      window.open(qrApiUrl, '_blank');
    };

    img.src = qrApiUrl;
  };

  const tables = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-namaha-green-dark border-2 border-namaha-gold/40 text-white space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-extrabold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>13 QR SYSTEM (12 TABLES + 1 GENERAL MENU)</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-namaha-gold flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              <span>Table & General Restaurant QR Management</span>
            </h2>
            <p className="text-xs text-gray-300 mt-1 max-w-xl">
              12 permanent table-specific QRs lock physical dining tables. The 13th General QR is for entrance, counter, reception, & social media promotions without forcing a table selection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintGeneralPoster}
              className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 border border-emerald-500/40"
            >
              <Printer className="w-4 h-4 text-emerald-200" />
              <span>Print General QR Poster</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintPoster('all')}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-extrabold text-xs shadow-lg hover:from-amber-400 hover:to-amber-500 transition flex items-center justify-center gap-2 flex-shrink-0 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print All 12 Table Posters</span>
            </button>
          </div>
        </div>

        {/* Base Website Domain Config */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-black/40 p-3.5 rounded-2xl border border-white/10">
          <span className="text-xs text-namaha-gold font-bold whitespace-nowrap">Target Domain URL:</span>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full sm:flex-1 px-3.5 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-namaha-gold font-mono"
            placeholder="https://namahaa.menuview.workers.dev"
          />
        </div>
      </div>

      {/* 13TH GENERAL RESTAURANT MENU QR CARD */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/90 via-namaha-green-dark to-black border-2 border-emerald-500/50 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-extrabold text-base shadow-inner">
              ⭐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-white text-lg">General Restaurant Menu QR</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase tracking-wider">
                  13th Public QR (No Table Assigned)
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Place at Entrance, Reception, Cashier Counter, Social Media & Flyers. Customers scan to view full digital menu without auto-assigning a table.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* QR Preview */}
          <div className="md:col-span-4 flex flex-col items-center justify-center bg-black/50 p-4 rounded-2xl border border-emerald-500/30">
            <QRCodeView value={`${baseUrl}/`} size={160} tableNumber={0} />
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest mt-2 block">
              PUBLIC WEBSITE LINK
            </span>
          </div>

          {/* Details & Actions */}
          <div className="md:col-span-8 space-y-4">
            <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1.5">
              <span className="text-[10px] text-namaha-gold font-bold uppercase tracking-wider block">
                Public Website URL:
              </span>
              <div className="flex items-center justify-between text-xs text-emerald-300 font-mono bg-white/5 p-2 rounded-xl border border-white/10">
                <span className="truncate pr-2">{baseUrl}/</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${baseUrl}/`);
                    setCopiedTokenTable(999);
                    setTimeout(() => setCopiedTokenTable(null), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 active:scale-95 flex-shrink-0"
                >
                  {copiedTokenTable === 999 ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{copiedTokenTable === 999 ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownloadGeneralPNG}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-namaha-gold via-amber-500 to-amber-600 text-namaha-green-deep font-extrabold text-xs shadow-lg hover:from-amber-400 hover:to-amber-500 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download General Poster PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrintGeneralPoster}
                className="flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-md transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print General Poster</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 12 Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {tables.map((tableNum) => {
          const token = tokensMap[tableNum] || `namahaa_tbl${tableNum}_default`;
          const fullScanUrl = `${baseUrl}/?t=${token}`;
          const isCopied = copiedTokenTable === tableNum;

          return (
            <div
              key={tableNum}
              className="p-5 rounded-3xl bg-namaha-green-dark border-2 border-white/10 hover:border-namaha-gold/50 transition-all shadow-xl flex flex-col justify-between space-y-4 group relative overflow-hidden"
            >
              {/* Card Top Title & Status Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-namaha-gold/20 border border-namaha-gold/40 text-namaha-gold flex items-center justify-center font-extrabold text-sm">
                    #{tableNum}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Table #{tableNum}</h3>
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">
                      Active QR Code
                    </span>
                  </div>
                </div>

                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Active Table" />
              </div>

              {/* QR Preview Component */}
              <div className="flex flex-col items-center justify-center py-2">
                <QRCodeView value={fullScanUrl} size={150} tableNumber={tableNum} />
              </div>

              {/* Token & Link Box */}
              <div className="p-2.5 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                <span className="text-[10px] text-namaha-gold font-bold uppercase tracking-wider block">Token: {token}</span>
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono truncate">
                  <span className="truncate pr-1">{fullScanUrl}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(tableNum, token)}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-gray-200 transition flex-shrink-0"
                    title="Copy full URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownloadPNG(tableNum, token)}
                  className="py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] border border-white/10 transition flex items-center justify-center gap-1"
                  title="Download Table Poster PNG"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintPoster(tableNum)}
                  className="py-2 px-1 rounded-xl bg-namaha-gold/20 hover:bg-namaha-gold/30 text-namaha-gold font-bold text-[11px] border border-namaha-gold/30 transition flex items-center justify-center gap-1"
                  title="Print Poster"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegenConfirmTable(tableNum)}
                  className="py-2 px-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-[11px] border border-red-500/30 transition flex items-center justify-center gap-1"
                  title="Regenerate Token"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regen</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regeneration Modal Dialog */}
      {regenConfirmTable !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="p-6 rounded-3xl bg-namaha-green-dark border-2 border-red-500/50 text-center space-y-4 max-w-sm w-full shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto animate-bounce" />
            <div>
              <h3 className="text-lg font-serif font-bold text-white">Regenerate Table #{regenConfirmTable} QR Code?</h3>
              <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                Regenerating this QR token will immediately <strong className="text-red-400">invalidate the old physical QR code</strong> for Table #{regenConfirmTable}. You will need to print the new QR poster.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRegenConfirmTable(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/20 text-gray-300"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isRegenerating}
                onClick={() => handleRegenerate(regenConfirmTable)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
