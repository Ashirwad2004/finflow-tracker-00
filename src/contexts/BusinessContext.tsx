import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type BusinessContextType = {
    isBusinessMode: boolean;
    toggleBusinessMode: (value: boolean) => Promise<void>;
    isLoading: boolean;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [isBusinessMode, setIsBusinessMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    console.log("BusinessProvider rendering. User:", user?.id);

    // Fetch initial state
    useEffect(() => {
        console.log("BusinessProvider useEffect triggering. User:", user?.id);
        const fetchSettings = async () => {
            if (!user) {
                console.log("No user in BusinessProvider, stopping load.");
                setIsLoading(false);
                return;
            }

            try {
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
        if (!user) return;

        setIsBusinessMode(value); // Optimistic update

        const { error } = await supabase
            .from('profiles')
            .update({ is_business_mode: value } as any) // Cast for missing column
            .eq('user_id', user.id);

        if (error) {
            console.error('Error updating business mode:', error);
            // Don't revert optimistic update immediately if it's just a column missing error, 
            // but log it. If user refreshes, it will be reset.
        }
    };

    return (
        <BusinessContext.Provider value={{ isBusinessMode, toggleBusinessMode, isLoading }}>
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
