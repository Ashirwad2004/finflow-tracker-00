import React from "react";

// Custom Premium Markdown text rendering component
export function MarkdownText({ text }: { text: string }) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    
    let tableRows: string[][] = [];
    let isTable = false;
    let listItems: string[] = [];
    let isList = false;

    const flushTable = (key: number) => {
        if (tableRows.length === 0) return null;
        const headers = tableRows[0];
        const bodyRows = tableRows.slice(2); // Skip header separator line
        
        tableRows = [];
        isTable = false;
        
        return (
            <div key={`table-${key}`} className="my-2.5 overflow-x-auto border border-violet-100 rounded-lg shadow-sm bg-card">
                <table className="min-w-full divide-y divide-border text-[11px]">
                    <thead className="bg-muted/40 font-semibold text-muted-foreground">
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="px-2.5 py-1.5 text-left font-medium">{h.trim()}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                        {bodyRows.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-background" : "bg-violet-50/10 dark:bg-violet-950/5"}>
                                {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-2.5 py-1 whitespace-nowrap text-foreground">{cell.trim()}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const flushList = (key: number) => {
        if (listItems.length === 0) return null;
        const items = [...listItems];
        listItems = [];
        isList = false;
        return (
            <ul key={`list-${key}`} className="list-disc pl-4 my-1.5 space-y-0.5 text-xs text-muted-foreground">
                {items.map((item, i) => (
                    <li key={i}>{parseInlineMarkdown(item)}</li>
                ))}
            </ul>
        );
    };

    const parseInlineMarkdown = (str: string) => {
        const parts = str.split(/(\*\*.*?\*\*|`.*?`)/);
        return parts.map((part, idx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={idx} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("`") && part.endsWith("`")) {
                return <code key={idx} className="px-1 py-0.5 rounded bg-muted font-mono text-[11px] text-pink-600 border border-muted-foreground/10">{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim().startsWith("|")) {
            if (isList) elements.push(flushList(i));
            isTable = true;
            const cells = line.split("|").slice(1, -1);
            tableRows.push(cells);
            continue;
        } else if (isTable) {
            elements.push(flushTable(i));
        }

        if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
            isList = true;
            listItems.push(line.trim().slice(2));
            continue;
        } else if (isList && !line.trim().startsWith("* ") && !line.trim().startsWith("- ")) {
            elements.push(flushList(i));
        }

        if (line.trim().startsWith("### ")) {
            elements.push(<h4 key={i} className="text-xs font-bold text-foreground mt-2.5 mb-1 flex items-center gap-1 border-b pb-0.5 uppercase tracking-wider">{parseInlineMarkdown(line.trim().slice(4))}</h4>);
            continue;
        }
        if (line.trim().startsWith("## ")) {
            elements.push(<h3 key={i} className="text-xs font-extrabold text-violet-600 dark:text-violet-400 mt-3 mb-1.5 flex items-center gap-1">{parseInlineMarkdown(line.trim().slice(3))}</h3>);
            continue;
        }

        if (line.trim().startsWith("> [!")) {
            const match = line.match(/> \[!(.*?)\]/);
            const alertType = match ? match[1] : "NOTE";
            let content = "";
            while (i + 1 < lines.length && lines[i + 1].trim().startsWith(">")) {
                i++;
                content += " " + lines[i].trim().slice(1).trim();
            }
            let borderCol = "border-l-violet-500 bg-violet-500/5";
            let titleCol = "text-violet-600 dark:text-violet-400 font-bold";
            if (alertType === "WARNING" || alertType === "CAUTION") {
                borderCol = "border-l-amber-500 bg-amber-500/5";
                titleCol = "text-amber-600 dark:text-amber-400 font-bold";
            } else if (alertType === "IMPORTANT") {
                borderCol = "border-l-rose-500 bg-rose-500/5";
                titleCol = "text-rose-600 dark:text-rose-400 font-bold";
            }
            elements.push(
                <div key={i} className={`p-2.5 my-2 border-l-4 rounded-r-lg ${borderCol} text-xs leading-relaxed`}>
                    <div className={`uppercase tracking-wide text-[10px] mb-0.5 ${titleCol}`}>{alertType}</div>
                    <div>{parseInlineMarkdown(content.trim() || line.slice(line.indexOf("]") + 1).trim())}</div>
                </div>
            );
            continue;
        }

        if (line.trim()) {
            elements.push(<p key={i} className="my-0.5 leading-relaxed text-xs text-foreground/90">{parseInlineMarkdown(line)}</p>);
        } else {
            elements.push(<div key={i} className="h-1.5" />);
        }
    }

    if (isTable) elements.push(flushTable(lines.length));
    if (isList) elements.push(flushList(lines.length));

    return <div className="space-y-0.5 leading-normal">{elements}</div>;
}
