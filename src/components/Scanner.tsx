/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';
import { soundService } from '../services/soundService';

interface ScannerProps {
  onScan: (text: string) => void;
  label: string;
  autoStart?: boolean;
}

export function Scanner({ onScan, label, autoStart = false }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader-container";

  const toggleScanner = async () => {
    soundService.playClick();
    if (isScanningRef.current) {
      await stopScanner();
    } else {
      setIsScanning(true);
      isScanningRef.current = true;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            if (!isScanningRef.current) return;
            // Immediately mark as not scanning to prevent multiple triggers
            isScanningRef.current = false;
            soundService.playBeep();
            onScan(decodedText);
            
            // Internal stop logic without the ref check since we just cleared it
            if (scannerRef.current) {
              scannerRef.current.stop().then(() => {
                scannerRef.current?.clear();
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
        setIsScanning(false);
        isScanningRef.current = false;
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Stop scanner error:", err);
      } finally {
        setIsScanning(false);
        isScanningRef.current = false;
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
