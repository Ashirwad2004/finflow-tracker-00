import React from 'react';

interface ThermalReceiptProps {
    data: {
        invoice_number: string;
        date: string;
        customer_name: string;
        items: {
            description: string;
            quantity: number | string;
            price: number | string;
            total: number | string;
        }[];
        subtotal: number;
        tax_rate?: number;
        tax_amount?: number;
        total_amount: number;
        business_details?: {
            name: string;
            address?: string;
            phone?: string;
            gst?: string;
        };
    };
    className?: string;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ data, className = "" }) => {
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-IN', {
                dateStyle: 'short',
                timeStyle: 'short',
                hour12: true
            }).toUpperCase();
        } catch {
            return dateString;
        }
    };

    const bizName = data.business_details?.name || "SHOP NAME";

    // Simulate slight horizontal misalignments common in thermal printers
    const getRandomOffset = () => {
        const offsets = ['translate-x-[0.5px]', '-translate-x-[0.5px]', 'translate-x-[1px]', '-translate-x-[1px]', 'translate-x-0'];
        return offsets[Math.floor(Math.random() * offsets.length)];
    };

    return (
        <div
            className={`thermal-receipt bg-[#fdfdfd] text-black p-4 mx-auto font-mono text-sm shadow-md relative overflow-hidden ${className}`}
            style={{
                width: '100%',
                maxWidth: '350px',
                minHeight: '400px',
                // Subtle crumpled paper effect using a radial gradient overlay
                backgroundImage: `
                    radial-gradient(circle at 10% 20%, rgba(0,0,0,0.01) 0%, transparent 20%),
                    radial-gradient(circle at 80% 40%, rgba(0,0,0,0.02) 0%, transparent 30%),
                    radial-gradient(circle at 30% 80%, rgba(0,0,0,0.01) 0%, transparent 20%)
                `,
                filter: 'grayscale(100%) contrast(1.1)',
            }}
            id="thermal-receipt-content"
        >
            {/* Faded ink effect wrapper */}
            <div className="opacity-90 tracking-tighter leading-snug">

                {/* Header Sub-section */}
                <div className={`text-center mb-3 flex flex-col items-center justify-center ${getRandomOffset()}`}>
                    <h1 className="font-bold text-xl uppercase mb-1 tracking-widest">{bizName}</h1>
                    {data.business_details?.address && (
                        <p className="text-xs whitespace-pre-wrap max-w-full">{data.business_details.address}</p>
                    )}
                    {data.business_details?.phone && (
                        <p className="text-xs mt-0.5">PH: {data.business_details.phone}</p>
                    )}
                    {data.business_details?.gst && (
                        <p className="text-xs mt-0.5">GSTIN: {data.business_details.gst}</p>
                    )}
                </div>

                {/* Separator */}
                <div className="w-full border-b-[1.5px] border-dashed border-black my-2 opacity-80" />

                {/* Bill Details */}
                <div className="text-xs space-y-1 mb-2">
                    <div className={`flex justify-between ${getRandomOffset()}`}>
                        <span>BILL NO: {data.invoice_number}</span>
                    </div>
                    <div className={`flex justify-between ${getRandomOffset()}`}>
                        <span>DATE: {formatDate(data.date || new Date().toISOString())}</span>
                    </div>
                    <div className={`flex justify-between mt-1 pt-1 ${getRandomOffset()}`}>
                        <span>CUSTOMER: {data.customer_name || 'CASH'}</span>
                    </div>
                </div>

                {/* Separator */}
                <div className="w-full border-b-[1.5px] border-dashed border-black my-2 opacity-80" />

                {/* Items Table Header */}
                <div className={`flex justify-between text-xs font-bold mb-1 ${getRandomOffset()}`}>
                    <span className="flex-1">ITEM</span>
                    <span className="w-12 text-center">QTY</span>
                    <span className="w-16 text-right">PRICE</span>
                    <span className="w-20 text-right">AMOUNT</span>
                </div>

                {/* Separator */}
                <div className="w-full border-b-[1.5px] border-dashed border-black my-2 opacity-80" />

                {/* Items List */}
                <div className="space-y-2 text-xs mb-3">
                    {data.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col">
                            {/* Item name can wrap */}
                            <div className={`w-full ${getRandomOffset()}`}>
                                {item.description}
                            </div>
                            {/* Quantities and prices on the next line or aligned if short */}
                            <div className={`flex justify-between mt-0.5 ${getRandomOffset()}`}>
                                <span className="flex-1"></span>
                                <span className="w-12 text-center">{item.quantity}</span>
                                <span className="w-16 text-right">{Number(item.price).toFixed(2)}</span>
                                <span className="w-20 text-right font-medium">₹{Number(item.total).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Separator */}
                <div className="w-full border-b-[1.5px] border-dashed border-black my-2 opacity-80" />

                {/* Totals Sub-section */}
                <div className="text-xs space-y-1 mb-3">
                    <div className={`flex justify-between ${getRandomOffset()}`}>
                        <span>SUBTOTAL</span>
                        <span>₹{data.subtotal.toFixed(2)}</span>
                    </div>
                    {data.tax_rate && data.tax_rate > 0 && (
                        <div className={`flex justify-between ${getRandomOffset()}`}>
                            <span>TAX ({data.tax_rate}%)</span>
                            <span>₹{(data.tax_amount || 0).toFixed(2)}</span>
                        </div>
                    )}

                    {/* Grand Total */}
                    <div className={`flex justify-between font-bold text-sm mt-2 pt-1 border-t-[1.5px] border-dashed border-black ${getRandomOffset()}`}>
                        <span>TOTAL AMOUNT</span>
                        <span>₹{data.total_amount.toFixed(2)}</span>
                    </div>
                </div>

                {/* Separator */}
                <div className="w-full border-b-[1.5px] border-dashed border-black my-2 opacity-80" />

                {/* Footer Sub-section */}
                <div className={`text-center text-xs mt-4 mb-2 flex flex-col items-center ${getRandomOffset()}`}>
                    <p className="font-bold mb-1">*** THANK YOU ***</p>
                    <p>PLEASE VISIT AGAIN</p>
                </div>

                {/* Optional Barcode / QR Code Placeholder */}
                <div className={`mt-6 flex flex-col items-center justify-center opacity-80 ${getRandomOffset()}`}>
                    {/* Pure CSS Barcode Mock */}
                    <div className="flex h-10 w-48 mb-1 items-end justify-center mix-blend-multiply">
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-black h-full"
                                style={{
                                    width: `${Math.max(1, Math.floor(Math.random() * 4))}px`,
                                    marginRight: `${Math.max(1, Math.floor(Math.random() * 3))}px`
                                }}
                            />
                        ))}
                    </div>
                    <p className="text-[10px] tracking-widest">{data.invoice_number.replace(/[^A-Z0-9]/ig, '')}</p>
                </div>

                {/* Thermal paper end cut spacing */}
                <div className="h-8"></div>
            </div>
        </div>
    );
};
