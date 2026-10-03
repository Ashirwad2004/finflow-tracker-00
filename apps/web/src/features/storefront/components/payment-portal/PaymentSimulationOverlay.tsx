import { SmartphoneCharging, Loader2, Lock } from "lucide-react";
import { SimulationStep } from "./types";

interface PaymentSimulationOverlayProps {
  simulatedApp: string;
  simulationStep: SimulationStep;
  getSimulatedAppColor: () => string;
}

export const PaymentSimulationOverlay = ({
  simulatedApp,
  simulationStep,
  getSimulatedAppColor,
}: PaymentSimulationOverlayProps) => {
  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center text-white select-none animate-in fade-in duration-300">
      <div
        className={`w-24 h-24 rounded-[2rem] bg-gradient-to-br ${getSimulatedAppColor()} p-0.5 shadow-2xl flex items-center justify-center mb-6 animate-pulse`}
        style={{ animationDuration: "2s" }}
      >
        <div className="w-full h-full bg-slate-900 rounded-[1.9rem] flex items-center justify-center">
          <SmartphoneCharging
            className="w-10 h-10 text-white animate-bounce"
            style={{ animationDuration: "1.5s" }}
          />
        </div>
      </div>

      <h3 className="text-xl font-black tracking-tight mb-2">
        {simulationStep === "opening" && `Launching ${simulatedApp}...`}
        {simulationStep === "approving" && "Waiting for approval..."}
        {simulationStep === "verifying" && "Verifying Payment Integrity..."}
      </h3>

      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
        {simulationStep === "opening" && "Securely handshaking with your UPI provider. Please wait."}
        {simulationStep === "approving" &&
          `We've sent a collect request to your ${simulatedApp} App. Please authorize it inside the app using your secure UPI PIN.`}
        {simulationStep === "verifying" && "Confirming signature hash and secure tokens with gateway driver..."}
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        {simulationStep === "approving" && (
          <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest animate-pulse">
            Do not hit back or close the browser
          </span>
        )}
      </div>

      {/* Secure Footer in Simulation */}
      <div className="absolute bottom-6 flex items-center gap-1.5 text-slate-500 text-[10px] font-bold tracking-widest uppercase">
        <Lock className="w-3.5 h-3.5" /> Secure UPI Collect Engine
      </div>
    </div>
  );
};
