import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    console.log("1. Verification started for:", body.student_email)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing System Keys. Check Supabase Project Settings.")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Insert the Booking
    const { data: booking, error: bErr } = await supabase.from('bookings').insert({
      event_id: body.event_id, 
      student_email: body.student_email, 
      status: 'verified',
      razorpay_payment_id: body.razorpay_payment_id, 
      razorpay_order_id: body.razorpay_order_id,
      team_name: body.team_name || null,
      selected_game: body.selected_game || null
    }).select().single()

    if (bErr) {
      console.error("Database Error:", bErr.message)
      throw bErr
    }

    // 3. Insert Members (Roster)
    if (body.members && body.members.length > 0) {
      const memPayload = body.members.map((email: string) => ({ 
        booking_id: booking.id, 
        event_id: body.event_id, 
        student_email: email 
      }))
      await supabase.from('booking_members').insert(memPayload)
    }

    console.log("4. Ticket Created Successfully ID:", booking.id)

    return new Response(JSON.stringify({ success: true, booking }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Verification Crash:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})