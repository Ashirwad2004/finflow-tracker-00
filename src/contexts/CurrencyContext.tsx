
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Currency = {
    code: string;
    symbol: string;
    name: string;
};

export const CURRENCIES: Currency[] = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
];

type CurrencyContextType = {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    formatCurrency: (amount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
    const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);

    // Load from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem('finflow_currency');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Validate against available currencies to ensure data integrity
                const found = CURRENCIES.find(c => c.code === parsed.code);
                if (found) {
                    setCurrencyState(found);
                }
            } catch (e) {
                console.error("Failed to parse saved currency", e);
            }
        }
    }, []);

    const setCurrency = (newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('finflow_currency', JSON.stringify(newCurrency));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
