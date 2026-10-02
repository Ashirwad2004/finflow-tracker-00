import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Delete,
  Divide,
  Minus,
  Plus,
  X,
  Equal,
} from "lucide-react";

interface StandardCalculatorTabProps {
  isActive: boolean;
}

export const StandardCalculatorTab: React.FC<StandardCalculatorTabProps> = ({ isActive }) => {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = useCallback(
    (num: string) => {
      if (waitingForOperand) {
        setDisplay(num);
        setWaitingForOperand(false);
      } else {
        setDisplay(display === "0" ? num : display + num);
      }
    },
    [waitingForOperand, display]
  );

  const calculate = useCallback(
    (firstValue: number, secondValue: number, op: string) => {
      switch (op) {
        case "+":
          return firstValue + secondValue;
        case "-":
          return firstValue - secondValue;
        case "*":
          return firstValue * secondValue;
        case "/":
          return secondValue === 0 ? 0 : firstValue / secondValue;
        default:
          return secondValue;
      }
    },
    []
  );

  const inputOperation = useCallback(
    (nextOperation: string) => {
      const inputValue = parseFloat(display);
      if (previousValue === null) {
        setPreviousValue(inputValue);
      } else if (operation) {
        const currentValue = previousValue || 0;
        const newValue = calculate(currentValue, inputValue, operation);
        setDisplay(`${parseFloat(newValue.toFixed(6))}`);
        setPreviousValue(newValue);
      }
      setWaitingForOperand(true);
      setOperation(nextOperation);
    },
    [display, previousValue, operation, calculate]
  );

  const performCalculation = useCallback(() => {
    const inputValue = parseFloat(display);
    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(`${parseFloat(newValue.toFixed(6))}`);
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  }, [display, previousValue, operation, calculate]);

  const clear = useCallback(() => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  }, [waitingForOperand, display]);

  const backspace = useCallback(() => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  }, [display]);

  // Apply GST Hotkey directly to current display
  const applyGstDirectly = (rate: number, mode: "add" | "remove") => {
    const val = parseFloat(display) || 0;
    if (val <= 0) return;
    let res = 0;
    if (mode === "add") {
      res = val * (1 + rate / 100);
    } else {
      res = val / (1 + rate / 100);
    }
    setDisplay(`${parseFloat(res.toFixed(2))}`);
    setWaitingForOperand(true);
  };

  // Keyboard navigation for Standard Mode
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const { key } = event;
      if (/[0-9]/.test(key)) {
        event.preventDefault();
        inputNumber(key);
      } else if (key === "+" || key === "-" || key === "*" || key === "/") {
        event.preventDefault();
        inputOperation(key);
      } else if (key === "." || key === ",") {
        event.preventDefault();
        inputDecimal();
      } else if (key === "Enter" || key === "=") {
        event.preventDefault();
        performCalculation();
      } else if (key === "Backspace") {
        event.preventDefault();
        backspace();
      } else if (key === "Escape") {
        event.preventDefault();
        clear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, inputNumber, inputOperation, inputDecimal, performCalculation, backspace, clear]);

  const btnKeypad =
    "h-11 text-base font-semibold rounded-xl transition-all duration-150 active:scale-95 border-0";

  return (
    <div className="space-y-3 mt-3">
      {/* LCD Display */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl shadow-inner relative flex flex-col items-end justify-end h-28 border border-slate-800">
        <div className="text-slate-400 text-xs font-medium h-5 flex items-center gap-1">
          {previousValue !== null && (
            <>
              {parseFloat(previousValue.toFixed(6))} {operation}
            </>
          )}
        </div>
        <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white break-all">
          {display}
        </div>
      </div>

      {/* Quick GST Modifier Strip */}
      <div className="space-y-1.5 p-2 bg-muted/40 rounded-xl border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            One-Tap GST Modifiers
          </span>
          <span className="text-[10px] text-primary font-semibold">Instant Calc</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[5, 12, 18, 28].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => applyGstDirectly(rate, "add")}
              className="py-1 px-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all"
              title={`Add ${rate}% GST`}
            >
              +{rate}%
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[5, 12, 18, 28].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => applyGstDirectly(rate, "remove")}
              className="py-1 px-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-all"
              title={`Remove ${rate}% GST`}
            >
              -{rate}%
            </button>
          ))}
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-2">
        <Button
          variant="ghost"
          onClick={clear}
          className={`${btnKeypad} col-span-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10`}
        >
          <RotateCcw className="mr-1.5 h-4 w-4" /> Clear
        </Button>
        <Button
          variant="ghost"
          onClick={backspace}
          className={`${btnKeypad} text-muted-foreground hover:bg-muted`}
        >
          <Delete className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          onClick={() => inputOperation("/")}
          className={`${btnKeypad} bg-primary/10 text-primary hover:bg-primary/20`}
        >
          <Divide className="h-4 w-4" />
        </Button>

        {["7", "8", "9"].map((num) => (
          <Button
            key={num}
            variant="outline"
            onClick={() => inputNumber(num)}
            className={`${btnKeypad} bg-card hover:bg-muted/70`}
          >
            {num}
          </Button>
        ))}
        <Button
          variant="secondary"
          onClick={() => inputOperation("*")}
          className={`${btnKeypad} bg-primary/10 text-primary hover:bg-primary/20`}
        >
          <X className="h-4 w-4" />
        </Button>

        {["4", "5", "6"].map((num) => (
          <Button
            key={num}
            variant="outline"
            onClick={() => inputNumber(num)}
            className={`${btnKeypad} bg-card hover:bg-muted/70`}
          >
            {num}
          </Button>
        ))}
        <Button
          variant="secondary"
          onClick={() => inputOperation("-")}
          className={`${btnKeypad} bg-primary/10 text-primary hover:bg-primary/20`}
        >
          <Minus className="h-4 w-4" />
        </Button>

        {["1", "2", "3"].map((num) => (
          <Button
            key={num}
            variant="outline"
            onClick={() => inputNumber(num)}
            className={`${btnKeypad} bg-card hover:bg-muted/70`}
          >
            {num}
          </Button>
        ))}
        <Button
          variant="secondary"
          onClick={() => inputOperation("+")}
          className={`${btnKeypad} bg-primary/10 text-primary hover:bg-primary/20`}
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          onClick={() => inputNumber("0")}
          className={`${btnKeypad} col-span-2 bg-card hover:bg-muted/70`}
        >
          0
        </Button>
        <Button
          variant="outline"
          onClick={inputDecimal}
          className={`${btnKeypad} bg-card hover:bg-muted/70 font-bold`}
        >
          .
        </Button>
        <Button
          onClick={performCalculation}
          className={`${btnKeypad} bg-primary text-primary-foreground hover:bg-primary/90 shadow-md`}
        >
          <Equal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
