import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// These headers are crucial so your React app is allowed to talk to this function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS preflight requests from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Get the event data sent from EventList.js
    const { amount, event_id } = await req.json()

    // 3. Securely pull your Razorpay API keys from Supabase Environment Variables
    const key_id = Deno.env.get('RAZORPAY_KEY_ID')
    const key_secret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!key_id || !key_secret) {
      throw new Error('Razorpay API keys are missing in the server environment.')
    }

    // Razorpay expects the amount in the smallest currency unit (Paise). ₹10 = 1000 Paise.
    const amountInPaise = Math.round(amount * 100)

    // 4. Create the secure authorization token
    const auth = btoa(`${key_id}:${key_secret}`)

    // 5. Ask Razorpay to generate an Order ID
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `event_${event_id}`
      })
    })

    const orderData = await response.json()

    if (!response.ok) {
      throw new Error(orderData.error?.description || 'Failed to create Razorpay order')
    }

    // 6. Send the generated Order ID back to your React frontend!
    return new Response(JSON.stringify(orderData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})