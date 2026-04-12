import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Grab environment variables
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  try {
    // 1. Extract the Razorpay Signature from headers
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    // 2. Read the raw body for signature verification
    const bodyText = await req.text();

    // 3. Verify the Webhook Signature securely
    const expectedSignature = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(bodyText)
      .toString('hex');

    if (expectedSignature !== signature) {
      console.error("🚨 Invalid Razorpay Signature Detected!");
      return new Response('Invalid signature', { status: 400 });
    }

    // 4. Parse the verified payload
    const event = JSON.parse(bodyText);

    // 5. Only process successful payments
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const orderEntity = event.payload.order ? event.payload.order.entity : event.payload.payment.entity;
      
      // We rely on Razorpay 'notes' to carry the booking data
      // Make sure your `create-razorpay-order` edge function attaches these notes!
      const notes = orderEntity.notes; 

      if (!notes || !notes.event_id || !notes.student_email) {
         console.log("No notes attached to order. Cannot process automatic booking.");
         return new Response('Missing notes payload', { status: 200 });
      }

      // Initialize Supabase Admin Client (Bypasses RLS)
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Check for duplicates (Did the frontend already successfully book this?)
      const { data: existingBooking } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('event_id', notes.event_id)
        .eq('student_email', notes.student_email)
        .eq('selected_game', notes.selected_game || null)
        .single();

      if (existingBooking) {
        console.log("✅ Booking already exists. Frontend succeeded earlier.");
        return new Response('Already processed', { status: 200 });
      }

      console.log("⚠️ Frontend missed the booking. Webhook stepping in to secure ticket!");

      // Parse members string back into an array
      let membersList: string[] = [];
      if (notes.members) {
         try { membersList = JSON.parse(notes.members); } catch (e) { membersList = [notes.student_email]; }
      } else {
         membersList = [notes.student_email];
      }

      // Call our robust Atomic SQL Function to secure the ticket
      const { data: bookingId, error } = await supabaseAdmin.rpc('book_ticket_atomically', {
        p_event_id: notes.event_id,
        p_student_email: notes.student_email,
        p_team_name: notes.team_name || null,
        p_selected_game: notes.selected_game || null,
        p_members: membersList
      });

      if (error) {
         console.error("❌ Webhook failed to secure ticket (Sold Out?):", error.message);
         // NOTE: If this fails because the event sold out, you would trigger a Razorpay Refund API call here.
         return new Response('Booking failed', { status: 500 });
      }

      console.log(`🎉 Webhook successfully saved ticket: ${bookingId}`);
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (err) {
    console.error("Critical Webhook Error:", err);
    return new Response('Internal Server Error', { status: 500 });
  }
});