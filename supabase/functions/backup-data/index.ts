import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface Expense {
    id: string;
    amount: number;
    description: string;
    date: string;
    category_id: string;
    user_id: string;
    created_at: string;
    payment_method: string;
}

const toCSV = (data: Expense[]): string => {
    if (data.length === 0) return "";
    const headers = [
        "Date",
        "Description",
        "Amount",
        "Category ID",
        "Payment Method",
        "Created At",
    ];
    const rows = data.map((row) =>
        [
            row.date,
            `"${row.description.replace(/"/g, '""')}"`, // Escape quotes
            row.amount,
            row.category_id,
            row.payment_method,
            row.created_at,
        ].join(",")
    );
    return [headers.join(","), ...rows].join("\n");
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user || !user.email) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }

        const { data: expenses, error: dbError } = await supabaseClient
            .from("expenses")
            .select("*")
            .order("date", { ascending: false });

        if (dbError) {
            throw dbError;
        }

        const csvData = toCSV(expenses as Expense[]);

        if (!RESEND_API_KEY) {
            console.error("RESEND_API_KEY is not set");
            return new Response(
                JSON.stringify({ error: "Email service not configured" }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "FinFlow Backup <noreply@resend.dev>", // Or a configured domain
                to: [user.email],
                subject: `Your Data Backup - ${new Date().toLocaleDateString()}`,
                html: `
          <h1>Your Data Backup is Ready</h1>
          <p>Hello,</p>
          <p>Attached is the CSV file containing your expense records as requested.</p>
          <p>Best regards,<br>FinFlow Tracker</p>
        `,
                attachments: [
                    {
                        filename: `expenses_backup_${new Date().toISOString().split("T")[0]}.csv`,
                        content: btoa(csvData), // Base64 encode the CSV content
                    },
                ],
            }),
        });

        const emailData = await res.json();

        if (!res.ok) {
            console.error("Resend API Error:", emailData);
            throw new Error(`Failed to send email: ${JSON.stringify(emailData)}`);
        }

        return new Response(
            JSON.stringify({ message: "Backup sent successfully", id: emailData.id }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
