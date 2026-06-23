import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";

type BusinessContextType = {
    isBusinessMode: boolean;
    toggleBusinessMode: (value: boolean) => Promise<void>;
    isLoading: boolean;
    isSalesman: boolean;
    salesmanStoreId: string | null;
    currentStoreId: string | null;
    setSalesmanSession: (session: { store_id: string; email: string; name: string } | null) => void;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [isBusinessMode, setIsBusinessMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSalesman, setIsSalesman] = useState(false);
    const [salesmanStoreId, setSalesmanStoreId] = useState<string | null>(null);

    const setSalesmanSession = (session: { store_id: string; email: string; name: string } | null) => {
        if (session) {
            localStorage.setItem("salesman_session", JSON.stringify(session));
            setIsSalesman(true);
            setSalesmanStoreId(session.store_id);
            setIsBusinessMode(true);
        } else {
            localStorage.removeItem("salesman_session");
            setIsSalesman(false);
            setSalesmanStoreId(null);
        }
    };

    // Fetch initial state
    useEffect(() => {
        const fetchSettings = async () => {
            // First check if there is a local salesman session in localStorage
            try {
                const storedSession = localStorage.getItem("salesman_session");
                if (storedSession) {
                    const session = JSON.parse(storedSession);
                    if (session && session.store_id) {
                        setIsSalesman(true);
                        setSalesmanStoreId(session.store_id);
                        setIsBusinessMode(true);
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.error("Error reading salesman session from localStorage:", e);
            }

            if (!user) {
                setIsSalesman(false);
                setSalesmanStoreId(null);
                setIsLoading(false);
                return;
            }

            try {
                // Check if user is a salesman
                const { data: salesmanData } = await supabase
                    .from('store_salesmen')
                    .select('store_id')
                    .eq('salesman_email', user.email || '')
                    .maybeSingle();

                if (salesmanData) {
                    setIsSalesman(true);
                    setSalesmanStoreId((salesmanData as any).store_id);
                    setIsBusinessMode(true); // Force business mode for salesmen
                    setIsLoading(false);
                    return;
                }

                // Reset salesman flags if not assigned
                setIsSalesman(false);
                setSalesmanStoreId(null);

                // Use any cast to avoid TS errors if column is missing from generated types
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_business_mode')
                    .eq('user_id', user.id)
                    .maybeSingle(); // Use maybeSingle to not error on 0 rows

                if (error) {
                    console.warn("Could not fetch business mode setting (column might be missing):", error.message);
                }

                if (data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setIsBusinessMode((data as any).is_business_mode || false);
                }
            } catch (error) {
                console.error('Error fetching business settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [user]);

    const toggleBusinessMode = async (value: boolean) => {
        if (!user || isSalesman) return;

        setIsBusinessMode(value); // Optimistic update

        const { error } = await (supabase as any)
            .from('profiles')
            .update({ is_business_mode: value }) // Cast for missing column
            .eq('user_id', user.id);

        if (error) {
            console.error('Error updating business mode:', error);
            // Don't revert optimistic update immediately if it's just a column missing error, 
            // but log it. If user refreshes, it will be reset.
        }
    };

    const currentStoreId = isSalesman ? salesmanStoreId : (user?.id || null);

    return (
        <BusinessContext.Provider value={{ 
            isBusinessMode, 
            toggleBusinessMode, 
            isLoading, 
            isSalesman, 
            salesmanStoreId, 
            currentStoreId,
            setSalesmanSession
        }}>
            {children}
        </BusinessContext.Provider>
    );
};

export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
};
