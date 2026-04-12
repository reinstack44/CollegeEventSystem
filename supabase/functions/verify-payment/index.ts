import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

Deno.serve(async (req) => {
  // 1. Instantly respond to Browser CORS preflight check
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      event_id,
      student_email,
      team_name,
      selected_game,
      members
    } = body;

    const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!secret) throw new Error("Razorpay secret is missing on the server.");

    // 2. Native Web Crypto HMAC Verification (Zero imports needed!)
    const encoder = new TextEncoder();
    const data = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
    const key = await crypto.subtle.importKey(
      "raw", 
      encoder.encode(secret), 
      { name: "HMAC", hash: "SHA-256" }, 
      false, 
      ["sign"]
    );
    const signatureBuf = await crypto.subtle.sign("HMAC", key, data);
    const generatedSignature = Array.from(new Uint8Array(signatureBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (generatedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    // 3. Initialize Admin Client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Secure Booking via SQL
    const membersArray = Array.isArray(members) ? members : [student_email];

    const { data: bookingId, error: rpcError } = await supabaseAdmin.rpc('book_ticket_atomically', {
      p_event_id: event_id,
      p_student_email: student_email,
      p_team_name: team_name || null,
      p_selected_game: selected_game || null,
      p_members: membersArray
    });

    if (rpcError) {
      throw new Error(`Booking failed: ${rpcError.message}`);
    }

    // 5. Update Transaction ID to mark as Paid
    await supabaseAdmin
      .from('bookings')
      .update({ transaction_id: razorpay_payment_id, status: 'verified' })
      .eq('id', bookingId);

    // 6. Return Success!
    return new Response(JSON.stringify({
      success: true,
      booking: { id: bookingId, status: 'verified' }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Verification Error:", error);
    // Send clean error back to React
    return new Response(JSON.stringify({ success: false, error: error.message || String(error) }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});