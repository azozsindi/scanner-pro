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
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
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
    // Provide visual feedback
    setLastScanned(decodedText);
    setTimeout(() => setLastScanned(null), 2000);
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
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center sticky top-0 bg-[#E4E3E0]/80 backdrop-blur-md z-50">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-2">
            <Package className="w-6 h-6" />
            Inventory Scanner
          </h1>
          <p className="text-[11px] font-serif italic opacity-60 uppercase tracking-widest mt-1">
            Professional Stock Management System
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportCSV}
            disabled={itemsArray.length === 0}
            className="px-4 py-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors flex items-center gap-2 text-xs font-bold uppercase disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button 
            onClick={clearInventory}
            className="px-4 py-2 border border-[#141414] hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Scanner Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-[#141414] p-1 bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <div className="border border-[#141414] p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-serif italic text-sm uppercase tracking-wider opacity-50">Scanner Control</h2>
                <div className={cn(
                  "px-2 py-0.5 text-[10px] font-mono border rounded-full uppercase",
                  isScanning ? "border-green-600 text-green-600 animate-pulse" : "border-red-600 text-red-600"
                )}>
                  {isScanning ? 'Live' : 'Standby'}
                </div>
              </div>

              {!isScanning ? (
                <button 
                  onClick={() => setIsScanning(true)}
                  className="w-full aspect-square border-2 border-dashed border-[#141414]/20 flex flex-col items-center justify-center gap-4 hover:bg-[#141414]/5 transition-colors group"
                >
                  <div className="w-16 h-16 rounded-full border border-[#141414] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Scan className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Start Scanning</span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div id="reader" className="w-full overflow-hidden border border-[#141414]"></div>
                  <button 
                    onClick={() => setIsScanning(false)}
                    className="w-full py-3 bg-[#141414] text-[#E4E3E0] text-xs font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-colors"
                  >
                    Stop Scanner
                  </button>
                </div>
              )}

              {lastScanned && (
                <div className="p-3 bg-green-50 border border-green-600 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-[10px] font-bold text-green-600 uppercase">Successfully Scanned</p>
                    <p className="text-xs font-mono font-bold">{lastScanned}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-[#141414] p-4 bg-white">
              <p className="font-serif italic text-[10px] uppercase opacity-50">Total Quantity</p>
              <p className="text-3xl font-bold font-mono">{totalItems}</p>
            </div>
            <div className="border border-[#141414] p-4 bg-white">
              <p className="font-serif italic text-[10px] uppercase opacity-50">Unique Items</p>
              <p className="text-3xl font-bold font-mono">{uniqueCodes}</p>
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-7">
          <div className="border border-[#141414] bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-[#141414] flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
              <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" />
                Scanned Records
              </h2>
              <span className="text-[10px] font-mono opacity-60">
                {itemsArray.length} ENTRIES FOUND
              </span>
            </div>

            <div className="flex-1 overflow-auto max-h-[600px]">
              {itemsArray.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-30">
                  <Package className="w-12 h-12 mb-4" />
                  <p className="text-sm font-serif italic">No items scanned yet.</p>
                  <p className="text-[10px] uppercase tracking-widest mt-2">Ready for input</p>
                </div>
              ) : (
                <div className="divide-y divide-[#141414]">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_120px_100px] p-3 bg-[#f5f5f5] text-[10px] font-serif italic uppercase tracking-wider opacity-50">
                    <div>Barcode / Code</div>
                    <div className="text-center">Quantity</div>
                    <div className="text-right">Actions</div>
                  </div>

                  {itemsArray.map((item) => (
                    <div 
                      key={item.code} 
                      className="grid grid-cols-[1fr_120px_100px] p-4 items-center hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-mono font-bold truncate pr-4">{item.code}</p>
                        <p className="text-[9px] font-serif italic opacity-50 group-hover:opacity-70">
                          Last seen: {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => updateCount(item.code, -1)}
                          className="w-6 h-6 border border-current flex items-center justify-center hover:bg-white hover:text-[#141414] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-lg font-bold font-mono min-w-[2ch] text-center">
                          {item.count}
                        </span>
                        <button 
                          onClick={() => updateCount(item.code, 1)}
                          className="w-6 h-6 border border-current flex items-center justify-center hover:bg-white hover:text-[#141414] transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex justify-end">
                        <button 
                          onClick={() => removeItem(item.code)}
                          className="p-2 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#141414] bg-[#f5f5f5] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 opacity-40" />
              <p className="text-[9px] font-serif italic opacity-50 uppercase tracking-wider">
                All data is stored locally in your browser. Clearing cache will remove records.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#141414] p-8 text-center">
        <p className="text-[10px] font-mono opacity-40 uppercase tracking-[0.2em]">
          Inventory Scanner v1.0.0 &copy; 2024
        </p>
      </footer>
    </div>
  );
}
