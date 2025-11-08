import { useState } from "react";
import { motion } from "framer-motion";
import { X, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CalculatorProps {
  onClose: () => void;
  isOpen: boolean;
}

const Calculator = ({ onClose, isOpen }: CalculatorProps) => {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (!display.includes(".")) {
      setDisplay(display + ".");
      setNewNumber(false);
    }
  };

  const handleOperation = (op: string) => {
    const currentValue = parseFloat(display);
    
    if (previousValue !== null && operation && !newNumber) {
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    } else {
      setPreviousValue(currentValue);
    }
    
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case "+":
        return prev + current;
      case "-":
        return prev - current;
      case "×":
        return prev * current;
      case "÷":
        return current !== 0 ? prev / current : 0;
      case "%":
        return prev % current;
      default:
        return current;
    }
  };

  const handleEquals = () => {
    if (previousValue !== null && operation) {
      const currentValue = parseFloat(display);
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
      setNewNumber(true);
    }
  };

  const buttons = [
    ["C", "⌫", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "="],
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm"
      >
        <Card className="border-border/50 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Calculator</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 mb-4 border border-border/50">
              <div className="text-right">
                {operation && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {previousValue} {operation}
                  </div>
                )}
                <div className="text-3xl font-bold text-foreground break-all">
                  {display}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              {buttons.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-4 gap-2">
                  {row.map((btn) => {
                    const isOperation = ["÷", "×", "-", "+", "%"].includes(btn);
                    const isEquals = btn === "=";
                    const isClear = btn === "C";
                    const isBackspace = btn === "⌫";
                    const isZero = btn === "0";

                    return (
                      <Button
                        key={btn}
                        variant={isOperation || isEquals ? "default" : "outline"}
                        className={`h-14 text-lg font-semibold ${
                          isZero ? "col-span-2" : ""
                        } ${
                          isEquals
                            ? "bg-success hover:bg-success/90 text-success-foreground"
                            : ""
                        } ${
                          isClear
                            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            : ""
                        }`}
                        onClick={() => {
                          if (isClear) handleClear();
                          else if (isBackspace) handleBackspace();
                          else if (isEquals) handleEquals();
                          else if (isOperation) handleOperation(btn);
                          else if (btn === ".") handleDecimal();
                          else handleNumber(btn);
                        }}
                      >
                        {isBackspace ? <Delete className="h-5 w-5" /> : btn}
                      </Button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Calculator;
