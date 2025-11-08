import { useEffect, useState } from "react";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useZxing } from "react-zxing";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const BarcodeScanner = ({ onScan, onClose, isOpen }: BarcodeScannerProps) => {
  const [scanned, setScanned] = useState(false);

  const hints = new Map();
  const formats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.QR_CODE,
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

  const { ref } = useZxing({
    constraints: {
      video: {
        facingMode: "environment",
      },
    },
    hints,
    paused: !isOpen,
    onDecodeResult(result) {
      if (!scanned && isOpen) {
        setScanned(true);
        onScan(result.getText());
        setTimeout(() => {
          setScanned(false);
          onClose();
        }, 1500);
      }
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setScanned(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl"
        >
          <Card className="border-border/50 overflow-hidden">
            <div className="relative bg-black">
              <video
                ref={ref}
                className="w-full aspect-video object-cover"
              />
              
              {/* Scanning Frame Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    opacity: scanned ? 0 : [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: scanned ? 0 : Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative w-64 h-40"
                >
                  {/* Corner borders */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary" />
                  
                  {/* Scanning line */}
                  {!scanned && (
                    <motion.div
                      animate={{ y: [0, 140, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]"
                    />
                  )}
                </motion.div>
              </div>

              {/* Success Animation */}
              <AnimatePresence>
                {scanned && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                      className="bg-primary rounded-full p-6"
                    >
                      <CheckCircle2 className="h-16 w-16 text-primary-foreground" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header with close button */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Camera className="h-5 w-5" />
                    <span className="font-semibold">Scan Barcode</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-center text-sm">
                  Position the barcode within the frame
                </p>
              </div>
            </div>
          </Card>

          <div className="mt-4 text-center">
            <Button variant="outline" onClick={onClose}>
              Cancel Scanning
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BarcodeScanner;
