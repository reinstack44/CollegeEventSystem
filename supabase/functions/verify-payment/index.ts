import crypto from 'node:crypto';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, event_id, student_email, team_name, selected_game, members } = body;

    const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!secret) throw new Error("Server is missing RAZORPAY_KEY_SECRET.");

    // 1. Bulletproof Node Crypto Signature Verification
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(text).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Signature mismatch! Payment was altered.");
    }

    // 2. Initialize Database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const membersArray = Array.isArray(members) ? members : [student_email];

    // 3. Book Ticket & Pass the 'verified' status directly
    const { data: bookingId, error: rpcError } = await supabaseAdmin.rpc('book_ticket_atomically', {
      p_event_id: event_id,
      p_student_email: student_email,
      p_team_name: team_name || null,
      p_selected_game: selected_game || null,
      p_members: membersArray,
      p_status: 'verified' 
    });

    if (rpcError) throw new Error(`Database Error: ${rpcError.message}`);

    // 4. Save the Transaction ID
    await supabaseAdmin.from('bookings').update({ transaction_id: razorpay_payment_id }).eq('id', bookingId);

    return new Response(JSON.stringify({ success: true, booking: { id: bookingId } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Verification Error:", error);
    // Crucial: Send the EXACT error text back to the frontend
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});