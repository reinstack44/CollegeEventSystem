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
    if (!secret) throw new Error("Payment verification service unavailable.");

    // Verify Payment Signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(text).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Payment verification failed. Please contact support if you were charged.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const membersArray = Array.isArray(members) ? members : [student_email];

    // SINGLE ATOMIC INSERT - If this fails, no ghost tickets are created!
    const { data: bookingId, error: rpcError } = await supabaseAdmin.rpc('book_ticket_atomically', {
      p_event_id: event_id,
      p_student_email: student_email,
      p_team_name: team_name || null,
      p_selected_game: selected_game || null,
      p_members: membersArray,
      p_status: 'verified',
      p_transaction_id: razorpay_payment_id
    });

    if (rpcError) throw new Error("Unable to secure ticket after payment. Please contact support with your payment details.");

    return new Response(JSON.stringify({ success: true, booking: { id: bookingId } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Verification Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "An unexpected error occurred during verification." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});