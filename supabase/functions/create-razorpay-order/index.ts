const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_FEE = 20;

Deno.serve(async (req) => {
  // 1. Instantly respond to the Browser's CORS preflight check
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { amount, event_id, student_email, team_name, selected_game, members } = payload;
    
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new Error("Razorpay keys are missing in Supabase Vault.");
    }

    const auth = btoa(`${keyId}:${keySecret}`);
    const baseAmount = Number(amount) || 0;
    const finalTotalAmount = baseAmount + PLATFORM_FEE;
    
    // 2. Call Razorpay
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(finalTotalAmount * 100), 
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        // 3. Strict 255 character limit for notes to prevent Razorpay crashes
        notes: {
          event_id: String(event_id || "").substring(0, 250),
          student_email: String(student_email || "").substring(0, 250),
          team_name: String(team_name || "").substring(0, 250),
          selected_game: String(selected_game || "").substring(0, 250),
          members: String(members || "").substring(0, 250)
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
       throw new Error(data.error?.description || "Razorpay API rejected the request");
    }

    // 4. Send success back to React
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Crash:", error);
    // 5. Send clean error back to React so we can read it on screen
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});