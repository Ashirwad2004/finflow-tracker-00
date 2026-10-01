import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThermalReceipt } from '@/features/sales/components/ThermalReceipt';

export const printThermalReceipt = async (data: any) => {
    // 1. Remove previous print frame if any
    const oldIframe = document.getElementById('finflow-thermal-print-frame');
    if (oldIframe && oldIframe.parentNode) {
        oldIframe.parentNode.removeChild(oldIframe);
    }

    // 2. Create a hidden iframe to hold the receipt
    const iframe = document.createElement('iframe');
    iframe.id = 'finflow-thermal-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');

    document.body.appendChild(iframe);

    // 3. Get the iframe document
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
        throw new Error("Unable to access iframe document for printing.");
    }

    // 4. Write basic HTML structure with Tailwind and offline print styles
    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap');
                
                body {
                    margin: 0;
                    padding: 0;
                    background-color: white;
                    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
                    -webkit-font-smoothing: none;
                }

                * {
                    box-sizing: border-box;
                    font-family: 'Courier Prime', 'Courier New', Courier, monospace !important;
                }

                @media print {
                    @page {
                        /* Standard 80mm thermal paper width. Length is dynamic. */
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        width: 80mm;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    ::-webkit-scrollbar {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div id="receipt-root"></div>
        </body>
        </html>
    `);
    iframeDoc.close();

    // 5. Wait for styles to settle
    await new Promise(resolve => setTimeout(resolve, 400));

    // 6. Render the React component into the iframe
    const rootElement = iframeDoc.getElementById('receipt-root');
    if (rootElement) {
        const root = createRoot(rootElement);
        await new Promise<void>((resolve) => {
            root.render(
                <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto', padding: '10px 4px' }}>
                    <ThermalReceipt data={data} />
                </div>
            );
            setTimeout(resolve, 150);
        });
    }

    // 7. Trigger print directly to printer
    try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    } catch (e) {
        console.error("Thermal print error:", e);
    }

    // 8. Retain iframe for 60 seconds so print spooler completes buffering
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 60000);
};