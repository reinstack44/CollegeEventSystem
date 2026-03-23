import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, event_id } = await req.json()

    const key_id = Deno.env.get('RAZORPAY_KEY_ID')
    const key_secret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!key_id || !key_secret) {
      throw new Error('Razorpay API keys are missing in the server environment.')
    }

    const amountInPaise = Math.round(amount * 100)
    const auth = btoa(`${key_id}:${key_secret}`)

    // FIXED: Just use the raw event_id (36 chars) so Razorpay doesn't crash!
    const safeReceiptId = String(event_id).substring(0, 40); 

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: safeReceiptId
      })
    })

    const orderData = await response.json()

    if (!response.ok) {
      throw new Error(orderData.error?.description || 'Failed to create Razorpay order')
    }

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