import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Search,
  Vibrate,
  Clock,
  Palette,
  Type as TypeIcon,
  LayoutGrid,
  Smartphone,
  Zap
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
  const [isScanning, setIsScanning] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'info' }[]>([]);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [cameras, setCameras] = useState<{ id: string, label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(localStorage.getItem('preferred_camera_id'));
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('inventory_settings');
    return saved ? JSON.parse(saved) : { 
      soundEnabled: true, 
      soundType: 'beep',
      vibrationEnabled: true,
      autoStopEnabled: false,
      scanDelay: 1000,
      theme: 'indigo',
      fontSize: 'medium',
      compactMode: false,
      darkMode: false
    };
  });
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Fetch cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        if (!selectedCameraId) {
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          const defaultId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(defaultId);
        }
      }
    }).catch(err => {
      console.error("Error getting cameras", err);
    });
  }, []);

  // Save selected camera
  useEffect(() => {
    if (selectedCameraId) {
      localStorage.setItem('preferred_camera_id', selectedCameraId);
    }
  }, [selectedCameraId]);

  const themes = {
    indigo: 'from-indigo-600 to-violet-700',
    emerald: 'from-emerald-600 to-teal-700',
    rose: 'from-rose-600 to-pink-700',
    amber: 'from-amber-600 to-orange-700',
    slate: 'from-slate-700 to-slate-900',
  };

  const accentColors = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    rose: 'bg-rose-600 hover:bg-rose-700 text-white',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white',
    slate: 'bg-slate-800 hover:bg-slate-900 text-white',
  };

  const ringColors = {
    indigo: 'focus:ring-indigo-500/20 focus:border-indigo-500',
    emerald: 'focus:ring-emerald-500/20 focus:border-emerald-500',
    rose: 'focus:ring-rose-500/20 focus:border-rose-500',
    amber: 'focus:ring-amber-500/20 focus:border-amber-500',
    slate: 'focus:ring-slate-500/20 focus:border-slate-500',
  };

  const textColors = {
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    slate: 'text-slate-800',
  };

  const currentTheme = themes[settings.theme as keyof typeof themes] || themes.indigo;
  const currentAccent = accentColors[settings.theme as keyof typeof accentColors] || accentColors.indigo;
  const currentRing = ringColors[settings.theme as keyof typeof ringColors] || ringColors.indigo;
  const currentText = textColors[settings.theme as keyof typeof textColors] || textColors.indigo;

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('inventory_settings', JSON.stringify(settings));
  }, [settings]);

  const addToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Sound effect function
  const playBeep = () => {
    if (!settings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (settings.soundType === 'digital') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.05);
      } else if (settings.soundType === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.02);
      } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      }

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + (settings.soundType === 'click' ? 0.02 : 0.1));
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
        fps: 15, 
        qrbox: { width: 250, height: 250 },
        // Removing strict aspectRatio to avoid OverconstrainedError on some devices
      };

      const startCamera = async (camConfig: any) => {
        try {
          await html5QrCode.start(
            camConfig, 
            config,
            onScanSuccess,
            onScanFailure
          );
          
          // Check for flash support
          try {
            const capabilities = html5QrCode.getRunningTrackCapabilities() as any;
            if (capabilities.torch) {
              setHasFlash(true);
            }
          } catch (e) {
            console.log("Flash not supported or error checking", e);
          }
        } catch (err: any) {
          console.error("Unable to start scanning with config", camConfig, err);
          
          // If the specific camera failed with OverconstrainedError, try a fallback
          if (selectedCameraId && camConfig.deviceId) {
            console.warn("Retrying with default environment camera...");
            startCamera({ facingMode: "environment" });
          } else if (camConfig.facingMode === "environment") {
            console.warn("Retrying with any available camera...");
            startCamera({}); // Try any camera
          } else {
            setIsScanning(false);
            addToast('عذراً، تعذر تشغيل الكاميرا. تأكد من منح الصلاحيات.', 'info');
          }
        }
      };

      const initialCameraConfig = selectedCameraId 
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: "environment" };

      startCamera(initialCameraConfig);

      scannerRef.current = html5QrCode;
    }

    return () => {
      if (scannerRef.current) {
        const stopScanner = async () => {
          if (scannerRef.current?.isScanning) {
            try {
              await scannerRef.current.stop();
            } catch (err) {
              console.error("Failed to stop scanner", err);
            }
          }
          scannerRef.current?.clear();
          scannerRef.current = null;
        };
        stopScanner();
      }
    };
  }, [isScanning, selectedCameraId]);

  const toggleFlash = async () => {
    if (!scannerRef.current || !hasFlash) return;
    try {
      const newState = !isFlashOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newState } as any]
      });
      setIsFlashOn(newState);
    } catch (e) {
      console.error("Error toggling flash", e);
    }
  };

  const triggerVibration = () => {
    if (settings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate(100);
    }
  };

  function onScanSuccess(decodedText: string) {
    const now = Date.now();
    if (now - lastScanTime < settings.scanDelay) return;
    
    setLastScanTime(now);
    handleScan(decodedText);
    setLastScanned(decodedText);
    setScanHistory(prev => [decodedText, ...prev].slice(0, 5));
    playBeep();
    triggerVibration();
    addToast(`تم مسح الكود: ${decodedText}`);

    if (settings.autoStopEnabled) {
      setIsScanning(false);
    }
  }

  function onScanFailure(error: any) {
    // We don't want to spam the console with scan failures
    // console.warn(`Code scan error = ${error}`);
  }

  const handleScan = (code: string, quantity: number = 1) => {
    setInventory(prev => {
      const existing = prev[code];
      return {
        ...prev,
        [code]: {
          code,
          count: existing ? existing.count + quantity : quantity,
          timestamp: Date.now()
        }
      };
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScan(manualCode.trim(), manualQuantity);
    setLastScanned(manualCode.trim());
    setScanHistory(prev => [manualCode.trim(), ...prev].slice(0, 5));
    playBeep();
    addToast(`تم إضافة ${manualQuantity} من ${manualCode.trim()}`);
    setManualCode('');
    setManualQuantity(1);
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
    addToast('تم تصدير ملف CSV بنجاح', 'info');
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(inventory, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    addToast('تم تصدير ملف JSON بنجاح', 'info');
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
          addToast('تم استيراد البيانات بنجاح');
        }
      } catch (err) {
        alert('خطأ في قراءة الملف. تأكد من أنه ملف JSON صالح.');
      }
    };
    fileReader.readAsText(file);
  };

  const clearAllData = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذه الخطوة.')) {
      setInventory({});
      setScanHistory([]);
      setLastScanned(null);
      addToast('تم مسح جميع البيانات', 'info');
    }
  };

  const itemsArray = (Object.values(inventory) as ScannedItem[])
    .filter(item => item.code.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.timestamp - a.timestamp);
  const totalItems = itemsArray.reduce((sum, item) => sum + item.count, 0);
  const uniqueCodes = itemsArray.length;

  return (
    <div dir="rtl" className={clsx(
      "min-h-screen transition-all duration-500 font-sans selection:bg-indigo-100 selection:text-indigo-900",
      settings.darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900",
      settings.fontSize === 'small' && 'text-[13px]',
      settings.fontSize === 'large' && 'text-[17px]'
    )}>
      {/* Header */}
      <header className={clsx(
        "sticky top-0 z-40 w-full bg-gradient-to-r shadow-lg transition-all duration-700", 
        currentTheme,
        settings.darkMode ? "shadow-black/20" : "shadow-slate-200/50"
      )}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 shadow-inner">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">مخزوني الذكي</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mt-1">نظام جرد احترافي</p>
            </div>
          </motion.div>

          <div className="flex items-center gap-2">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/20 text-white transition-all"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Scanner Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-5 space-y-6"
        >
          <div className={clsx(
            "rounded-3xl shadow-xl border p-6 space-y-6 overflow-hidden relative transition-all duration-500",
            settings.darkMode ? "bg-slate-900 border-slate-800 shadow-black/40" : "bg-white border-slate-100 shadow-slate-200/60"
          )}>
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Scan className={clsx("w-4 h-4", currentText)} />
                منطقة المسح
              </h2>
              <div className="flex items-center gap-3">
                {hasFlash && isScanning && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleFlash}
                    className={clsx(
                      "p-2 rounded-lg transition-all",
                      isFlashOn ? "bg-yellow-400 text-slate-900" : "bg-slate-800 text-white"
                    )}
                  >
                    <Zap className={clsx("w-4 h-4", isFlashOn && "fill-current")} />
                  </motion.button>
                )}
                {isScanning && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">مباشر</span>
                  </span>
                )}
              </div>
            </div>

            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-inner group">
              <div id="reader" className="w-full h-full"></div>
              
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[2px] transition-all duration-500">
                  <Scan className="w-12 h-12 text-white/20 mb-2" />
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">الكاميرا متوقفة</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {!isScanning ? (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsScanning(true)}
                  className={clsx("w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-all flex items-center justify-center gap-3", currentAccent)}
                >
                  <Scan className="w-5 h-5" />
                  تشغيل الماسح
                </motion.button>
              ) : (
                <div className="flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsScanning(false)}
                    className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3"
                  >
                    <X className="w-5 h-5" />
                    إيقاف الماسح
                  </motion.button>
                  
                  {hasFlash && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={toggleFlash}
                      className={clsx(
                        "px-6 py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center",
                        isFlashOn ? "bg-yellow-400 text-slate-900" : "bg-slate-800 text-white"
                      )}
                    >
                      <Zap className={clsx("w-5 h-5", isFlashOn && "fill-current")} />
                    </motion.button>
                  )}
                </div>
              )}
              {!isScanning && (
                <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">استخدم الكاميرا الخلفية للجرد السريع</p>
              )}
            </div>

            <div className={clsx("pt-4 border-t", settings.darkMode ? "border-slate-800" : "border-slate-100")}>
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
                    className={clsx(
                      "flex-1 px-4 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 transition-all", 
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900",
                      currentRing
                    )}
                  />
                  <input 
                    type="number"
                    min="1"
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(parseInt(e.target.value) || 1)}
                    className={clsx(
                      "w-20 px-4 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 transition-all", 
                      settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900",
                      currentRing
                    )}
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!manualCode.trim()}
                    className={clsx("px-4 py-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed", currentAccent)}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </form>
            </div>

            <AnimatePresence mode="wait">
              {lastScanned && (
                <motion.div 
                  key={lastScanned}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="space-y-3"
                >
                  <div className={clsx("p-5 text-white rounded-xl shadow-lg transition-all duration-500", currentTheme)}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">آخر مسح ناجح</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-black tracking-tighter truncate">{lastScanned}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="px-2 py-1 bg-white/20 rounded text-[10px] font-bold">تم التحديث تلقائياً</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              whileHover={{ y: -5 }}
              className={clsx(
                "p-5 rounded-3xl shadow-lg border transition-all duration-500",
                settings.darkMode ? "bg-slate-900 border-slate-800 shadow-black/20" : "bg-white border-slate-100 shadow-slate-200/50"
              )}
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">إجمالي القطع</p>
              <p className={clsx("text-3xl font-black tracking-tighter", currentText)}>{totalItems}</p>
            </motion.div>
            <motion.div 
              whileHover={{ y: -5 }}
              className={clsx(
                "p-5 rounded-3xl shadow-lg border transition-all duration-500",
                settings.darkMode ? "bg-slate-900 border-slate-800 shadow-black/20" : "bg-white border-slate-100 shadow-slate-200/50"
              )}
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">أكواد فريدة</p>
              <p className={clsx("text-3xl font-black tracking-tighter", settings.darkMode ? "text-white" : "text-slate-900")}>{uniqueCodes}</p>
            </motion.div>
          </div>
        </motion.div>

        {/* List Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-7"
        >
          <div className={clsx(
            "rounded-3xl shadow-xl border flex flex-col min-h-[600px] overflow-hidden transition-all duration-500",
            settings.darkMode ? "bg-slate-900 border-slate-800 shadow-black/40" : "bg-white border-slate-100 shadow-slate-200/60"
          )}>
            <div className={clsx(
              "p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all",
              settings.darkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50/50 border-slate-100"
            )}>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-slate-400 whitespace-nowrap">
                  <History className={clsx("w-4 h-4", currentText)} />
                  السجلات الممسوحة
                </h2>
                <span className={clsx(
                  "px-2 py-0.5 rounded text-[10px] font-bold font-mono", 
                  settings.darkMode ? "bg-slate-700 text-slate-300" : (settings.theme === 'slate' ? 'bg-slate-200 text-slate-700' : `bg-${settings.theme}-100 text-${settings.theme}-600`)
                )}>
                  {itemsArray.length} إدخالات
                </span>
              </div>
              
              <div className="relative w-full sm:w-64 group">
                <Search className={clsx("absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors", `group-focus-within:${currentText}`)} />
                <input 
                  type="text"
                  placeholder="بحث عن كود..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={clsx(
                    "w-full pr-10 pl-4 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-2 transition-all", 
                    settings.darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900",
                    currentRing
                  )}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto max-h-[700px] scrollbar-hide">
              <AnimatePresence initial={false}>
                {itemsArray.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center p-12 text-center opacity-20"
                  >
                    <Package className="w-16 h-16 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">
                      {searchQuery ? 'لا توجد نتائج للبحث.' : 'لم يتم مسح أي عناصر بعد.'}
                    </p>
                  </motion.div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {itemsArray.map((item) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        key={item.code}
                        className={clsx(
                          "p-4 sm:p-6 flex items-center justify-between transition-colors group",
                          settings.darkMode ? "hover:bg-slate-800/50 border-b border-slate-800/50" : "hover:bg-slate-50/80 border-b border-slate-50",
                          settings.compactMode && "py-3"
                        )}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={clsx(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", 
                            settings.darkMode ? "bg-slate-800 text-slate-300" : (settings.theme === 'slate' ? 'bg-slate-100 text-slate-600' : `bg-${settings.theme}-50 ${currentText}`)
                          )}>
                            <Package className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className={clsx("text-sm font-black tracking-tight truncate", settings.darkMode ? "text-white" : "text-slate-900")}>{item.code}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {new Date(item.timestamp).toLocaleTimeString('ar-SA')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-6">
                          <div className={clsx(
                            "flex items-center rounded-xl p-1 border shadow-inner",
                            settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
                          )}>
                            <motion.button 
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateCount(item.code, -1)}
                              className={clsx(
                                "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                                settings.darkMode ? "text-slate-400 hover:text-red-400 hover:bg-slate-700" : "text-slate-500 hover:text-red-600 hover:bg-white"
                              )}
                            >
                              <Minus className="w-4 h-4" />
                            </motion.button>
                            <span className={clsx("w-10 text-center font-black text-sm", settings.darkMode ? "text-white" : "text-slate-900")}>{item.count}</span>
                            <motion.button 
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateCount(item.code, 1)}
                              className={clsx(
                                "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                                settings.darkMode ? "hover:bg-slate-700" : "hover:bg-white",
                                currentText
                              )}
                            >
                              <Plus className="w-4 h-4" />
                            </motion.button>
                          </div>
                          
                          <motion.button 
                            whileHover={{ scale: 1.1, color: '#ef4444' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeItem(item.code)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className={clsx(
              "p-6 border-t flex justify-between items-center transition-all",
              settings.darkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50/50 border-slate-100"
            )}>
              <div className="flex gap-2">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={exportJSON}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2.5 border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm",
                    settings.darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <FileJson className="w-3.5 h-3.5" />
                  تصدير JSON
                </motion.button>
                <label className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer",
                  settings.darkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}>
                  <Save className="w-3.5 h-3.5" />
                  استيراد
                  <input type="file" accept=".json" onChange={importJSON} className="hidden" />
                </label>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">إجمالي القطع: {totalItems}</p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Toasts */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={clsx(
                "px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 backdrop-blur-md border",
                toast.type === 'success' 
                  ? "bg-emerald-500/90 text-white border-emerald-400/30" 
                  : "bg-indigo-500/90 text-white border-indigo-400/30"
              )}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={clsx(
                "relative w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500",
                settings.darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
              )}
            >
              <div className={clsx("p-6 text-white flex justify-between items-center", currentTheme)}>
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6" />
                  <h2 className="text-lg font-black tracking-tight">إعدادات النظام</h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-auto scrollbar-hide">
                {/* Camera Selection */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Smartphone className="w-3 h-3" />
                    إعدادات الكاميرا
                  </h3>
                  <div className={clsx(
                    "p-4 rounded-2xl border transition-all",
                    settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                  )}>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">اختر الكاميرا</label>
                    <select 
                      value={selectedCameraId || ''}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className={clsx(
                        "w-full rounded-xl p-3 text-sm font-bold outline-none transition-all",
                        settings.darkMode ? "bg-slate-900 border border-slate-700 text-white" : "bg-white border border-slate-200 text-slate-900"
                      )}
                    >
                      {cameras.map(camera => (
                        <option key={camera.id} value={camera.id}>{camera.label || `Camera ${camera.id}`}</option>
                      ))}
                    </select>
                  </div>
                </section>

                {/* Sound & Haptics */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Volume2 className="w-3 h-3" />
                    الصوت والاهتزاز
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className={clsx(
                      "p-4 rounded-2xl border transition-all space-y-4",
                      settings.soundEnabled ? (settings.darkMode ? "bg-indigo-900/20 border-indigo-800" : "bg-indigo-50 border-indigo-200") : (settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                          <span className={clsx("text-sm font-bold", settings.soundEnabled ? (settings.darkMode ? "text-indigo-300" : "text-indigo-900") : "text-slate-600")}>تنبيهات صوتية</span>
                        </div>
                        <button 
                          onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
                          className={clsx("w-10 h-5 rounded-full relative transition-all", settings.soundEnabled ? "bg-indigo-600" : "bg-slate-300")}
                        >
                          <div className={clsx("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", settings.soundEnabled ? "right-6" : "right-1")} />
                        </button>
                      </div>
                      
                      {settings.soundEnabled && (
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          {['beep', 'click', 'digital'].map(type => (
                            <button
                              key={type}
                              onClick={() => {
                                setSettings(s => ({ ...s, soundType: type }));
                                setTimeout(playBeep, 50);
                              }}
                              className={clsx(
                                "py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                settings.soundType === type 
                                  ? "bg-indigo-600 text-white shadow-lg" 
                                  : (settings.darkMode ? "bg-slate-700 text-slate-400 hover:bg-slate-600" : "bg-white text-slate-600 hover:bg-slate-100")
                              )}
                            >
                              {type === 'beep' ? 'صافرة' : type === 'click' ? 'نقرة' : 'رقمي'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setSettings(s => ({ ...s, vibrationEnabled: !s.vibrationEnabled }))}
                      className={clsx(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                        settings.vibrationEnabled ? (settings.darkMode ? "bg-indigo-900/20 border-indigo-800" : "bg-indigo-50 border-indigo-200") : (settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Vibrate className={clsx("w-5 h-5", settings.vibrationEnabled ? "text-indigo-600" : "text-slate-400")} />
                        <span className={clsx("text-sm font-bold", settings.vibrationEnabled ? (settings.darkMode ? "text-indigo-300" : "text-indigo-900") : "text-slate-600")}>اهتزاز عند المسح</span>
                      </div>
                      <div className={clsx("w-10 h-5 rounded-full relative transition-all", settings.vibrationEnabled ? "bg-indigo-600" : "bg-slate-300")}>
                        <div className={clsx("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", settings.vibrationEnabled ? "right-6" : "right-1")} />
                      </div>
                    </button>
                  </div>
                </section>

                {/* Scan Logic */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    منطق المسح
                  </h3>
                  <div className="space-y-4">
                    <div className={clsx(
                      "p-4 rounded-2xl border transition-all",
                      settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex justify-between items-center mb-4">
                        <span className={clsx("text-sm font-bold", settings.darkMode ? "text-slate-300" : "text-slate-700")}>تأخير المسح المتكرر</span>
                        <span className="text-xs font-black text-indigo-600">{settings.scanDelay}ms</span>
                      </div>
                      <input 
                        type="range" min="500" max="3000" step="100"
                        value={settings.scanDelay}
                        onChange={(e) => setSettings(s => ({ ...s, scanDelay: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    <button 
                      onClick={() => setSettings(s => ({ ...s, autoStopEnabled: !s.autoStopEnabled }))}
                      className={clsx(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                        settings.autoStopEnabled ? (settings.darkMode ? "bg-indigo-900/20 border-indigo-800" : "bg-indigo-50 border-indigo-200") : (settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RotateCcw className={clsx("w-5 h-5", settings.autoStopEnabled ? "text-indigo-600" : "text-slate-400")} />
                        <span className={clsx("text-sm font-bold", settings.autoStopEnabled ? (settings.darkMode ? "text-indigo-300" : "text-indigo-900") : "text-slate-600")}>إيقاف تلقائي بعد المسح</span>
                      </div>
                      <div className={clsx("w-10 h-5 rounded-full relative transition-all", settings.autoStopEnabled ? "bg-indigo-600" : "bg-slate-300")}>
                        <div className={clsx("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", settings.autoStopEnabled ? "right-6" : "right-1")} />
                      </div>
                    </button>
                  </div>
                </section>

                {/* Appearance */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Palette className="w-3 h-3" />
                    المظهر والسمات
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))}
                      className={clsx(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                        settings.darkMode ? "bg-indigo-900/20 border-indigo-800" : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className={clsx("w-5 h-5", settings.darkMode ? "text-indigo-400" : "text-slate-400")} />
                        <span className={clsx("text-sm font-bold", settings.darkMode ? "text-indigo-300" : "text-slate-600")}>الوضع الليلي</span>
                      </div>
                      <div className={clsx("w-10 h-5 rounded-full relative transition-all", settings.darkMode ? "bg-indigo-600" : "bg-slate-300")}>
                        <div className={clsx("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", settings.darkMode ? "right-6" : "right-1")} />
                      </div>
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    {Object.keys(themes).map((t) => (
                      <button 
                        key={t}
                        onClick={() => setSettings(s => ({ ...s, theme: t }))}
                        className={clsx(
                          "aspect-square rounded-xl border-2 transition-all flex items-center justify-center",
                          settings.theme === t ? (settings.darkMode ? "border-white scale-110 shadow-lg" : "border-slate-900 scale-110 shadow-lg") : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className={clsx("w-full h-full rounded-lg bg-gradient-to-br", themes[t as keyof typeof themes])} />
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={clsx(
                      "p-4 rounded-2xl border transition-all",
                      settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center gap-2 mb-3">
                        <TypeIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold text-slate-400">حجم الخط</span>
                      </div>
                      <select 
                        value={settings.fontSize}
                        onChange={(e) => setSettings(s => ({ ...s, fontSize: e.target.value }))}
                        className={clsx(
                          "w-full rounded-lg p-2 text-xs font-bold outline-none",
                          settings.darkMode ? "bg-slate-900 border border-slate-700 text-white" : "bg-white border border-slate-200 text-slate-900"
                        )}
                      >
                        <option value="small">صغير</option>
                        <option value="medium">متوسط</option>
                        <option value="large">كبير</option>
                      </select>
                    </div>

                    <button 
                      onClick={() => setSettings(s => ({ ...s, compactMode: !s.compactMode }))}
                      className={clsx(
                        "flex flex-col items-start justify-center p-4 rounded-2xl border transition-all",
                        settings.compactMode ? (settings.darkMode ? "bg-indigo-900/20 border-indigo-800" : "bg-indigo-50 border-indigo-200") : (settings.darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <LayoutGrid className={clsx("w-4 h-4", settings.compactMode ? "text-indigo-600" : "text-slate-400")} />
                        <span className={clsx("text-xs font-bold", settings.compactMode ? (settings.darkMode ? "text-indigo-300" : "text-indigo-900") : "text-slate-600")}>وضع مضغوط</span>
                      </div>
                      <span className="text-[9px] text-slate-400">تقليل المسافات</span>
                    </button>
                  </div>
                </section>

                {/* Danger Zone */}
                <section className={clsx("pt-4 border-t space-y-4", settings.darkMode ? "border-slate-800" : "border-slate-100")}>
                  <button 
                    onClick={clearAllData}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 font-bold text-sm hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    مسح جميع البيانات
                  </button>
                  
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Info className="w-3 h-3" />
                    الإصدار 2.6.0 • مخزوني الذكي
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
