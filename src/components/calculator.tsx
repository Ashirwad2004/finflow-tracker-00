import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "*":
        return firstValue * secondValue;
      case "/":
        return firstValue / secondValue;
      default:
        return secondValue;
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

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
          <div className="text-right text-2xl font-mono overflow-hidden">
            {display}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <Button
            variant="outline"
            onClick={clear}
            className="col-span-2"
          >
            Clear
          </Button>
          <Button
            variant="outline"
            onClick={backspace}
          >
            ⌫
          </Button>
          <Button
            variant="outline"
            onClick={() => inputOperation("/")}
          >
            ÷
          </Button>

          {/* Row 2 */}
          <Button
            variant="outline"
            onClick={() => inputNumber("7")}
          >
            7
          </Button>
          <Button
            variant="outline"
            onClick={() => inputNumber("8")}
          >
            8
          </Button>
          <Button
            variant="outline"
            onClick={() => inputNumber("9")}
          >
            9
          </Button>
          <Button
            variant="outline"
            onClick={() => inputOperation("*")}
          >
            ×
          </Button>

          {/* Row 3 */}
          <Button
            variant="outline"
            onClick={() => inputNumber("4")}
          >
            4
          </Button>
          <Button
            variant="outline"
            onClick={() => inputNumber("5")}
          >
            5
          </Button>
          <Button
            variant="outline"
            onClick={() => inputNumber("6")}
          >
            6
          </Button>
          <Button
            variant="outline"
            onClick={() => inputOperation("-")}
          >
            −
          </Button>

          {/* Row 4 */}
          <Button
            variant="outline"
            onClick={() => inputNumber("1")}
          >
            1
          </Button>
          <Button
            variant="outline"
            onClick={() => inputNumber("2")}
          >
            2
          </Button>
          <Button
            variant="outline"
            onClick={() => inputNumber("3")}
          >
            3
          </Button>
          <Button
            variant="outline"
            onClick={() => inputOperation("+")}
          >
            +
          </Button>

          {/* Row 5 */}
          <Button
            variant="outline"
            onClick={() => inputNumber("0")}
            className="col-span-2"
          >
            0
          </Button>
          <Button
            variant="outline"
            onClick={inputDecimal}
          >
            .
          </Button>
          <Button
            variant="default"
            onClick={performCalculation}
          >
            =
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
