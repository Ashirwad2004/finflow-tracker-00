import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThermalReceipt } from '@/features/business/components/ThermalReceipt';

export const printThermalReceipt = async (data: any) => {
    // 1. Create a hidden iframe to hold the receipt
    const iframe = document.createElement('iframe');
    // Hide it but don't use display: none; otherwise print might fail in some browsers
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    // 2. Get the iframe document
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error("Unable to access iframe document for printing.");
    }

    // 3. Write basic HTML structure with Tailwind CDN and custom print CSS
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

                /* Force monospace globally in the iframe */
                * {
                    font-family: 'Courier Prime', 'Courier New', Courier, monospace !important;
                }

                @media print {
                    @page {
                        /* Standard 80mm thermal paper width. Length is auto. */
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        width: 80mm;
                    }
                    /* Ensure background graphics (watermarks/crumpled effects) print */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Hide scrollbars */
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

    // 4. Wait for styles to load (especially Tailwind and fonts)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Render the React component into the iframe
    const rootElement = iframeDoc.getElementById('receipt-root');
    if (rootElement) {
        const root = createRoot(rootElement);
        // We wrap in a promise to wait for React to finish rendering
        await new Promise<void>((resolve) => {
            root.render(
                <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto', padding: '10px 5px' }}>
                    <ThermalReceipt data={data} />
                </div>
            );
            // Give React a moment to flush to DOM
            setTimeout(resolve, 100);
        });
    }

    // 6. Trigger print dialog
    try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    } catch (e) {
        console.error("Print failed", e);
    }

    // 7. Cleanup after printing (or if user cancels)
    // We add a slight delay to ensure the print dialog has fully opened before removing the iframe
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 1000);
};
