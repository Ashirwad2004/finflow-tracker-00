import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claims?.claims) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub;
    console.log(`Starting backup for user: ${userId}`);

    // Fetch all user data from different tables
    const [
      expensesResult,
      budgetsResult,
      lentMoneyResult,
      borrowedMoneyResult,
      salesResult,
      purchasesResult,
      productsResult,
      splitBillsResult,
      profileResult,
    ] = await Promise.all([
      supabase.from("expenses").select("*").eq("user_id", userId),
      supabase.from("budgets").select("*").eq("user_id", userId),
      supabase.from("lent_money").select("*").eq("user_id", userId),
      supabase.from("borrowed_money").select("*").eq("user_id", userId),
      supabase.from("sales").select("*").eq("user_id", userId),
      supabase.from("purchases").select("*").eq("user_id", userId),
      supabase.from("products").select("*").eq("user_id", userId),
      supabase.from("split_bills").select("*, split_bill_participants(*)").eq("user_id", userId),
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
    ]);

    // Check for any errors
    const errors: string[] = [];
    if (expensesResult.error) errors.push(`Expenses: ${expensesResult.error.message}`);
    if (budgetsResult.error) errors.push(`Budgets: ${budgetsResult.error.message}`);
    if (lentMoneyResult.error) errors.push(`Lent Money: ${lentMoneyResult.error.message}`);
    if (borrowedMoneyResult.error) errors.push(`Borrowed Money: ${borrowedMoneyResult.error.message}`);
    if (salesResult.error) errors.push(`Sales: ${salesResult.error.message}`);
    if (purchasesResult.error) errors.push(`Purchases: ${purchasesResult.error.message}`);
    if (productsResult.error) errors.push(`Products: ${productsResult.error.message}`);
    if (splitBillsResult.error) errors.push(`Split Bills: ${splitBillsResult.error.message}`);

    if (errors.length > 0) {
      console.error("Errors fetching data:", errors);
    }

    // Compile the backup data
    const backupData = {
      exportedAt: new Date().toISOString(),
      userId: userId,
      profile: profileResult.data || null,
      expenses: expensesResult.data || [],
      budgets: budgetsResult.data || [],
      lentMoney: lentMoneyResult.data || [],
      borrowedMoney: borrowedMoneyResult.data || [],
      sales: salesResult.data || [],
      purchases: purchasesResult.data || [],
      products: productsResult.data || [],
      splitBills: splitBillsResult.data || [],
    };

    console.log(`Backup completed successfully. Expenses: ${backupData.expenses.length}, Sales: ${backupData.sales.length}`);

    return new Response(
      JSON.stringify(backupData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="finflow-backup-${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Backup error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
