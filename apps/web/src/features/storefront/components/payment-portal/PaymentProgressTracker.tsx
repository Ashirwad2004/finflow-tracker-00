export const PaymentProgressTracker = () => {
  return (
    <div className="bg-slate-50 border-b border-border py-3.5 px-6 flex items-center justify-between text-xs font-semibold text-muted-foreground select-none">
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-black">
          1
        </span>
        <span>Cart details</span>
      </div>
      <div className="w-8 h-[1px] bg-slate-200 flex-1 mx-2" />
      <div className="flex items-center gap-1.5 text-primary">
        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[9px] font-black shadow-sm animate-pulse">
          2
        </span>
        <span className="font-bold">Secure payment</span>
      </div>
      <div className="w-8 h-[1px] bg-slate-200 flex-1 mx-2" />
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[9px] font-black">
          3
        </span>
        <span>Order placed</span>
      </div>
    </div>
  );
};
