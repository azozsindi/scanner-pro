/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';
import { soundService } from '../services/soundService';
import { toast } from 'sonner';

interface ScannerProps {
  onScan: (text: string) => void;
  label: string;
  autoStart?: boolean;
}

export function Scanner({ onScan, label, autoStart = false }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2, 11)}`).current;

  const toggleScanner = async () => {
    soundService.playClick();
    if (isScanningRef.current) {
      await stopScanner();
    } else {
      setIsScanning(true);
      isScanningRef.current = true;
      // Wait for DOM to update
      setTimeout(async () => {
        const element = document.getElementById(containerId);
        if (!element) {
          console.error("Scanner container not found");
          setIsScanning(false);
          isScanningRef.current = false;
          return;
        }

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;
        try {
          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            (decodedText) => {
              if (!isScanningRef.current) return;
              isScanningRef.current = false;
              soundService.playBeep();
              onScan(decodedText);
              
              if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                  try { scannerRef.current?.clear(); } catch(e) {}
                  setIsScanning(false);
                }).catch(err => {
                  console.error("Async stop error:", err);
                  setIsScanning(false);
                });
              }
            },
            () => {}
          );
        } catch (err) {
          console.error("Scanner start error:", err);
          toast.error("فشل تشغيل الكاميرا. تأكد من إعطاء الصلاحية.");
          setIsScanning(false);
          isScanningRef.current = false;
        }
      }, 200);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        try { scannerRef.current.clear(); } catch(e) {}
      } catch (err) {
        console.error("Stop scanner error:", err);
      } finally {
        setIsScanning(false);
        isScanningRef.current = false;
        scannerRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (autoStart) {
      toggleScanner();
    }
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="mb-4">
      <button
        onClick={toggleScanner}
        className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2"
      >
        {isScanning ? <X size={20} /> : <Camera size={20} />}
        {isScanning ? "إغلاق" : label}
      </button>
      <div 
        id={containerId} 
        className={`mt-2 rounded-xl overflow-hidden border-4 border-blue-800 bg-black ${isScanning ? 'block' : 'hidden'}`}
      />
    </div>
  );
}
