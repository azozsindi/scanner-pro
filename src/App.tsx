import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  CheckCircle2,
  Settings,
  X,
  Volume2,
  VolumeX,
  FileJson,
  Info,
  Save,
  Search
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('inventory_settings');
    return saved ? JSON.parse(saved) : { soundEnabled: true, theme: 'indigo' };
  });
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('inventory_settings', JSON.stringify(settings));
  }, [settings]);

  // Sound effect function
  const playBeep = () => {
    if (!settings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio context error", e);
    }
  };

  // Save to localStorage whenever inventory changes
  useEffect(() => {
    localStorage.setItem('inventory_data', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      const html5QrCode = new Html5Qrcode("reader");
      
      const config = { 
        fps: 10, 
        qrbox: { width: 300, height: 150 },
        aspectRatio: 1.777778
      };

      html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        onScanSuccess,
        onScanFailure
      ).catch(err => {
        console.error("Unable to start scanning", err);
        setIsScanning(false);
      });

      scannerRef.current = html5QrCode;
    }

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          }).catch(err => {
            console.error("Failed to stop scanner", err);
          });
        } else {
          scannerRef.current.clear();
          scannerRef.current = null;
        }
      }
    };
  }, [isScanning]);

  function onScanSuccess(decodedText: string) {
    handleScan(decodedText);
    setLastScanned(decodedText);
    setScanHistory(prev => [decodedText, ...prev].slice(0, 5));
    playBeep();
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScan(manualCode.trim());
    setLastScanned(manualCode.trim());
    setScanHistory(prev => [manualCode.trim(), ...prev].slice(0, 5));
    playBeep();
    setManualCode('');
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

    const headers = ['الكود', 'العدد', 'آخر مسح'];
    const rows = items.map(item => [
      item.code,
      item.count,
      new Date(item.timestamp).toLocaleString('ar-SA')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(inventory, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        if (window.confirm('سيؤدي هذا إلى استبدال بياناتك الحالية. هل أنت متأكد؟')) {
          setInventory(importedData);
          alert('تم استيراد البيانات بنجاح!');
        }
      } catch (err) {
        alert('خطأ في قراءة الملف. تأكد من أنه ملف JSON صالح.');
      }
    };
    fileReader.readAsText(file);
  };

  const itemsArray = (Object.values(inventory) as ScannedItem[])
    .filter(item => item.code.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.timestamp - a.timestamp);
  const totalItems = itemsArray.reduce((sum, item) => sum + item.count, 0);
  const uniqueCodes = itemsArray.length;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-indigo-100 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 bg-white/80 backdrop-blur-md z-50 gap-4 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tighter flex items-center gap-2 text-indigo-600">
            <Package className="w-5 h-5 sm:w-6 h-6" />
            ماسح المخزون
          </h1>
          <p className="text-[10px] sm:text-[11px] font-medium opacity-60 uppercase tracking-widest mt-1 text-slate-500">
            نظام إدارة المخزون الاحترافي
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex-1 sm:flex-none p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all flex items-center justify-center"
            title="الإعدادات"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={exportCSV}
            disabled={itemsArray.length === 0}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold uppercase shadow-lg shadow-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 h-4" />
            تصدير CSV
          </button>
          <button 
            onClick={clearInventory}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold uppercase"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 h-4" />
            إعادة ضبط
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Scanner Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400">التحكم بالماسح</h2>
                <div className={cn(
                  "px-2.5 py-1 text-[10px] font-bold border rounded-full uppercase tracking-tight",
                  isScanning ? "border-emerald-100 bg-emerald-50 text-emerald-600 animate-pulse" : "border-slate-100 bg-slate-50 text-slate-400"
                )}>
                  {isScanning ? 'الكاميرا مباشرة' : 'في الانتظار'}
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
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">بدء المسح</span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div id="reader" className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-inner"></div>
                  <button 
                    onClick={() => setIsScanning(false)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    إيقاف الماسح
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">إدخال يدوي</h2>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="أدخل الكود يدوياً..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!manualCode.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>

              {lastScanned && (
                <div className="space-y-3">
                  <div className="p-5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">آخر نتيجة مسح</p>
                      <div className="bg-white/20 p-1 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-mono font-bold break-all">{lastScanned}</p>
                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[10px] uppercase opacity-70 font-bold">العدد الحالي:</span>
                      <span className="text-sm font-bold font-mono bg-white/20 px-2 py-0.5 rounded">{inventory[lastScanned]?.count || 0}</span>
                    </div>
                  </div>

                  {scanHistory.length > 1 && (
                    <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">سجل الجلسة (آخر 5)</p>
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
              <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">الكمية الإجمالية</p>
              <p className="text-3xl font-bold font-mono text-emerald-600 mt-1">{totalItems}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">العناصر الفريدة</p>
              <p className="text-3xl font-bold font-mono text-indigo-600 mt-1">{uniqueCodes}</p>
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col min-h-[500px] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-slate-600 whitespace-nowrap">
                  <History className="w-4 h-4 text-indigo-500" />
                  السجلات الممسوحة
                </h2>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-bold font-mono">
                  {itemsArray.length} إدخالات
                </span>
              </div>
              
              <div className="relative w-full sm:w-64 group">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="بحث عن كود..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto max-h-[600px]">
              {itemsArray.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-20">
                  <Package className="w-12 h-12 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">
                    {searchQuery ? 'لا توجد نتائج للبحث.' : 'لم يتم مسح أي عناصر بعد.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {/* Table Header */}
                  <div className="hidden sm:grid grid-cols-[1fr_120px_100px] p-4 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <div>الباركود / الكود</div>
                    <div className="text-center">الكمية</div>
                    <div className="text-right">الإجراءات</div>
                  </div>

                  {itemsArray.map((item) => (
                    <div 
                      key={item.code} 
                      className="flex flex-col sm:grid sm:grid-cols-[1fr_120px_100px] p-5 items-start sm:items-center hover:bg-slate-50 transition-all group gap-4 sm:gap-0"
                    >
                      <div className="space-y-1 w-full text-right">
                        <p className="text-sm font-mono font-bold break-all sm:truncate pr-4 text-slate-700 group-hover:text-indigo-600 transition-colors">{item.code}</p>
                        <p className="text-[10px] font-medium text-slate-400">
                          آخر ظهور: {new Date(item.timestamp).toLocaleTimeString('ar-SA')}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-center gap-3 w-full sm:w-auto border-t border-slate-50 sm:border-0 pt-4 sm:pt-0">
                        <span className="sm:hidden text-[10px] font-bold uppercase text-slate-400">الكمية</span>
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
                          title="حذف العنصر"
                        >
                          <span className="sm:hidden text-[10px] font-bold uppercase">حذف العنصر</span>
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
                يتم تخزين جميع البيانات محلياً في متصفحك. مسح ذاكرة التخزين المؤقت سيؤدي إلى حذف السجلات.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-100 p-8 text-center space-y-2 bg-white">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          ماسح المخزون v1.0.0 &copy; 2026
        </p>
        <p className="text-[11px] font-medium text-slate-500">
          تطوير <span className="font-bold uppercase tracking-widest text-indigo-600">abdulaziz sindi</span>
        </p>
      </footer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div dir="rtl" className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-lg text-slate-800">إعدادات التطبيق</h2>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8 max-h-[70vh] overflow-auto">
              {/* Sound Settings */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  التنبيهات الصوتية
                </h3>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">صوت المسح</p>
                    <p className="text-[11px] text-slate-500">تشغيل صوت "بيب" عند نجاح المسح</p>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      settings.soundEnabled ? "bg-indigo-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.soundEnabled ? "left-1" : "left-7"
                    )} />
                  </button>
                </div>
              </section>

              {/* Data Management */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  إدارة البيانات
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={exportJSON}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 text-right">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">تصدير نسخة احتياطية</p>
                        <p className="text-[10px] text-slate-500">حفظ جميع البيانات كملف JSON</p>
                      </div>
                    </div>
                  </button>

                  <label className="w-full p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group cursor-pointer">
                    <div className="flex items-center gap-3 text-right">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600">
                        <Save className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">استيراد بيانات</p>
                        <p className="text-[10px] text-slate-500">تحميل بيانات من ملف JSON سابق</p>
                      </div>
                    </div>
                    <input type="file" accept=".json" onChange={importJSON} className="hidden" />
                  </label>
                </div>
              </section>

              {/* App Info */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  عن التطبيق
                </h3>
                <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-[11px] opacity-60 uppercase tracking-wider">الإصدار</span>
                    <span className="text-xs font-mono font-bold">1.0.0</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-[11px] opacity-60 uppercase tracking-wider">المطور</span>
                    <span className="text-xs font-bold">abdulaziz sindi</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] opacity-60 uppercase tracking-wider">الترخيص</span>
                    <span className="text-xs font-bold">نسخة احترافية</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
