import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone required" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${SERVICE_SID}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Channel: "sms",
        }),
      }
    );

    const data = await twilioRes.json();

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: corsHeaders,
        status: 500,
      }
    );
  }

});