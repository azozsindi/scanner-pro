import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Scan, 
  Trash2, 
  Plus, 
  Minus, 
  Download, 
  RotateCcw, 
  Package, 
  History,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { InventoryState, ScannedItem } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [inventory, setInventory] = useState<InventoryState>(() => {
    const saved = localStorage.getItem('inventory_data');
    return saved ? JSON.parse(saved) : {};
  });
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Save to localStorage whenever inventory changes
  useEffect(() => {
    localStorage.setItem('inventory_data', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 300, height: 150 },
          aspectRatio: 1.777778,
          videoConstraints: {
            facingMode: "environment"
          }
        },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner", error);
        });
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  function onScanSuccess(decodedText: string) {
    handleScan(decodedText);
    setLastScanned(decodedText);
    setScanHistory(prev => [decodedText, ...prev].slice(0, 5));
  }

  function onScanFailure(error: any) {
    // We don't want to spam the console with scan failures
    // console.warn(`Code scan error = ${error}`);
  }

  const handleScan = (code: string) => {
    setInventory(prev => {
      const existing = prev[code];
      return {
        ...prev,
        [code]: {
          code,
          count: existing ? existing.count + 1 : 1,
          timestamp: Date.now()
        }
      };
    });
  };

  const updateCount = (code: string, delta: number) => {
    setInventory(prev => {
      const item = prev[code];
      if (!item) return prev;
      
      const newCount = Math.max(0, item.count + delta);
      if (newCount === 0) {
        const { [code]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [code]: { ...item, count: newCount }
      };
    });
  };

  const removeItem = (code: string) => {
    setInventory(prev => {
      const { [code]: _, ...rest } = prev;
      return rest;
    });
  };

  const clearInventory = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع البيانات؟')) {
      setInventory({});
    }
  };

  const exportCSV = () => {
    const items = Object.values(inventory) as ScannedItem[];
    if (items.length === 0) return;

    const headers = ['Code', 'Count', 'Last Scanned'];
    const rows = items.map(item => [
      item.code,
      item.count,
      new Date(item.timestamp).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const itemsArray = (Object.values(inventory) as ScannedItem[]).sort((a, b) => b.timestamp - a.timestamp);
  const totalItems = itemsArray.reduce((sum, item) => sum + item.count, 0);
  const uniqueCodes = itemsArray.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-indigo-100 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 bg-white/80 backdrop-blur-md z-50 gap-4 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tighter uppercase flex items-center gap-2 text-indigo-600">
            <Package className="w-5 h-5 sm:w-6 h-6" />
            Inventory Scanner
          </h1>
          <p className="text-[10px] sm:text-[11px] font-medium opacity-60 uppercase tracking-widest mt-1 text-slate-500">
            Professional Stock Management System
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={exportCSV}
            disabled={itemsArray.length === 0}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold uppercase shadow-lg shadow-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 h-4" />
            Export CSV
          </button>
          <button 
            onClick={clearInventory}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold uppercase"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 h-4" />
            Reset
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Scanner Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400">Scanner Control</h2>
                <div className={cn(
                  "px-2.5 py-1 text-[10px] font-bold border rounded-full uppercase tracking-tight",
                  isScanning ? "border-emerald-100 bg-emerald-50 text-emerald-600 animate-pulse" : "border-slate-100 bg-slate-50 text-slate-400"
                )}>
                  {isScanning ? 'Live Camera' : 'Standby'}
                </div>
              </div>

              {!isScanning ? (
                <button 
                  onClick={() => setIsScanning(true)}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-indigo-100 bg-indigo-50/30 flex flex-col items-center justify-center gap-4 hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center group-hover:scale-110 transition-transform text-indigo-600">
                    <Scan className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Start Scanning</span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div id="reader" className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-inner"></div>
                  <button 
                    onClick={() => setIsScanning(false)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    Stop Scanner
                  </button>
                </div>
              )}

              {lastScanned && (
                <div className="space-y-3">
                  <div className="p-5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Last Scanned Result</p>
                      <div className="bg-white/20 p-1 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-mono font-bold break-all">{lastScanned}</p>
                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[10px] uppercase opacity-70 font-bold">Current Count:</span>
                      <span className="text-sm font-bold font-mono bg-white/20 px-2 py-0.5 rounded">{inventory[lastScanned]?.count || 0}</span>
                    </div>
                  </div>

                  {scanHistory.length > 1 && (
                    <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">Session History (Last 5)</p>
                      <div className="space-y-2">
                        {scanHistory.map((code, idx) => (
                          <div key={`${code}-${idx}`} className={cn(
                            "text-[11px] font-mono flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0",
                            idx === 0 ? "font-bold text-indigo-600" : "text-slate-500"
                          )}>
                            <span className="truncate pr-4">{code}</span>
                            <span className="flex-shrink-0 font-bold">#{inventory[code]?.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Total Quantity</p>
              <p className="text-3xl font-bold font-mono text-emerald-600 mt-1">{totalItems}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Unique Items</p>
              <p className="text-3xl font-bold font-mono text-indigo-600 mt-1">{uniqueCodes}</p>
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col min-h-[500px] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-slate-600">
                <History className="w-4 h-4 text-indigo-500" />
                Scanned Records
              </h2>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold font-mono">
                {itemsArray.length} ENTRIES
              </span>
            </div>

            <div className="flex-1 overflow-auto max-h-[600px]">
              {itemsArray.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-20">
                  <Package className="w-12 h-12 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">No items scanned yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {/* Table Header */}
                  <div className="hidden sm:grid grid-cols-[1fr_120px_100px] p-4 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <div>Barcode / Code</div>
                    <div className="text-center">Quantity</div>
                    <div className="text-right">Actions</div>
                  </div>

                  {itemsArray.map((item) => (
                    <div 
                      key={item.code} 
                      className="flex flex-col sm:grid sm:grid-cols-[1fr_120px_100px] p-5 items-start sm:items-center hover:bg-slate-50 transition-all group gap-4 sm:gap-0"
                    >
                      <div className="space-y-1 w-full">
                        <p className="text-sm font-mono font-bold break-all sm:truncate pr-4 text-slate-700 group-hover:text-indigo-600 transition-colors">{item.code}</p>
                        <p className="text-[10px] font-medium text-slate-400">
                          Last seen: {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-center gap-3 w-full sm:w-auto border-t border-slate-50 sm:border-0 pt-4 sm:pt-0">
                        <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">Quantity</span>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => updateCount(item.code, -1)}
                            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all bg-white shadow-sm"
                          >
                            <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <span className="text-lg font-bold font-mono min-w-[2.5ch] text-center text-slate-700">
                            {item.count}
                          </span>
                          <button 
                            onClick={() => updateCount(item.code, 1)}
                            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white hover:border-indigo-200 hover:text-indigo-600 transition-all bg-white shadow-sm"
                          >
                            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end w-full sm:w-auto">
                        <button 
                          onClick={() => removeItem(item.code)}
                          className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg flex items-center gap-2 sm:block"
                          title="Remove item"
                        >
                          <span className="sm:hidden text-[10px] font-bold uppercase">Remove Item</span>
                          <Trash2 className="w-5 h-5 sm:w-4.5 sm:h-4.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                All data is stored locally in your browser. Clearing cache will remove records.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-100 p-8 text-center space-y-2 bg-white">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Inventory Scanner v1.0.0 &copy; 2026
        </p>
        <p className="text-[11px] font-medium text-slate-500">
          Developed by <span className="font-bold uppercase tracking-widest text-indigo-600">abdulaziz sindi</span>
        </p>
      </footer>
    </div>
  );
}
