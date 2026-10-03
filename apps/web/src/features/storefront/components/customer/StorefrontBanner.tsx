import React from "react";

interface StorefrontBannerProps {
    businessName: string;
    search: string;
    onSearchChange: (val: string) => void;
}

export const StorefrontBanner: React.FC<StorefrontBannerProps> = ({
    businessName,
    search,
    onSearchChange,
}) => {
    return (
        <div
            className="relative overflow-hidden border-b border-violet-900/30"
            style={{
                background:
                    "linear-gradient(135deg, hsl(258 90% 18%) 0%, hsl(272 85% 24%) 60%, hsl(290 75% 20%) 100%)",
            }}
        >
            {/* Subtle grid */}
            <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                    backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
                    backgroundSize: "32px 32px",
                }}
            />
            {/* Subtle glow */}
            <div
                className="absolute right-0 top-0 w-80 h-32 opacity-20"
                style={{
                    background: "radial-gradient(circle, hsl(290 80% 60%) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Left: tagline */}
                    <div>
                        <p className="text-white font-bold text-sm">{businessName}</p>
                        <p className="text-white/50 text-xs mt-0.5">
                            Browse and order directly from us
                        </p>
                    </div>

                    {/* Right: search */}
                    <div className="relative w-full sm:w-72">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search items"
                            className="w-full h-9 pl-9 pr-3 rounded-lg text-xs text-white placeholder:text-white/35 focus:outline-none transition-all"
                            style={{
                                background: "rgba(255,255,255,0.1)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                backdropFilter: "blur(8px)",
                            }}
                            onFocus={(e) =>
                                (e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)")
                            }
                            onBlur={(e) =>
                                (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
