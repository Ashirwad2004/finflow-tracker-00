import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Delete, Divide, Minus, Plus, X, Equal, RotateCcw } from "lucide-react";

export const Calculator = () => {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(`${parseFloat(newValue.toFixed(7))}`);
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string) => {
    switch (operation) {
      case "+": return firstValue + secondValue;
      case "-": return firstValue - secondValue;
      case "*": return firstValue * secondValue;
      case "/": return firstValue / secondValue;
      default: return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(`${parseFloat(newValue.toFixed(7))}`);
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const backspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  // Helper to visualize the correct icon
  const getOpIcon = (op: string) => {
    switch (op) {
      case "/": return <Divide className="h-4 w-4" />;
      case "*": return <X className="h-4 w-4" />;
      case "-": return <Minus className="h-4 w-4" />;
      case "+": return <Plus className="h-4 w-4" />;
      default: return op;
    }
  };

  // Common button styles for animation and shape
  const btnBase = "h-16 text-xl rounded-2xl transition-all duration-200 active:scale-90 hover:shadow-md border-0";

  return (
    <div className="flex items-center justify-center min-h-[500px] p-4 bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-3xl">
      <Card className="w-full max-w-[320px] shadow-2xl border-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
        <CardContent className="p-5">
          {/* Display Screen */}
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl mb-6 shadow-inner relative flex flex-col items-end justify-end h-32 transition-colors">
            
            {/* History / Previous Operation */}
            <div className="text-gray-400 dark:text-gray-500 text-sm font-medium h-6 flex items-center gap-1">
              {previousValue !== null && (
                <>
                  {parseFloat(previousValue.toFixed(7))} 
                  {operation && <span className="text-primary">{getOpIcon(operation)}</span>}
                </>
              )}
            </div>
            
            {/* Main Numbers */}
            <div className="text-4xl font-bold tracking-tight text-gray-800 dark:text-gray-100 break-all">
              {display}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-3">
            
            {/* Utility Row */}
            <Button
              variant="ghost"
              onClick={clear}
              className={`${btnBase} col-span-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30`}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Clear
            </Button>
            
            <Button
              variant="ghost"
              onClick={backspace}
              className={`${btnBase} text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800`}
            >
              <Delete className="h-5 w-5" />
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => inputOperation("/")}
              className={`${btnBase} bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400`}
            >
              <Divide className="h-6 w-6" />
            </Button>

            {/* Row 7-9 */}
            {["7", "8", "9"].map((num) => (
              <Button
                key={num}
                variant="outline"
                onClick={() => inputNumber(num)}
                className={`${btnBase} bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50`}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="secondary"
              onClick={() => inputOperation("*")}
              className={`${btnBase} bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400`}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Row 4-6 */}
            {["4", "5", "6"].map((num) => (
              <Button
                key={num}
                variant="outline"
                onClick={() => inputNumber(num)}
                className={`${btnBase} bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50`}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="secondary"
              onClick={() => inputOperation("-")}
              className={`${btnBase} bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400`}
            >
              <Minus className="h-6 w-6" />
            </Button>

            {/* Row 1-3 */}
            {["1", "2", "3"].map((num) => (
              <Button
                key={num}
                variant="outline"
                onClick={() => inputNumber(num)}
                className={`${btnBase} bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50`}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="secondary"
              onClick={() => inputOperation("+")}
              className={`${btnBase} bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400`}
            >
              <Plus className="h-6 w-6" />
            </Button>

            {/* Bottom Row */}
            <Button
              variant="outline"
              onClick={() => inputNumber("0")}
              className={`${btnBase} col-span-2 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50`}
            >
              0
            </Button>
            <Button
              variant="outline"
              onClick={inputDecimal}
              className={`${btnBase} bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 font-bold`}
            >
              .
            </Button>
            <Button
              onClick={performCalculation}
              className={`${btnBase} bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none`}
            >
              <Equal className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};