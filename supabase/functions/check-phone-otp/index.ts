import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID")!;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const { phone, code } = await req.json();

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SERVICE_ROLE_KEY
    );

    /* ---------------------------
       VERIFY OTP WITH TWILIO
    ---------------------------- */

    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${SERVICE_SID}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          Code: code,
        }),
      }
    );

    const twilioData = await twilioRes.json();

    if (twilioData.status !== "approved") {
      return new Response(
        JSON.stringify({ verified: false }),
        { headers: corsHeaders }
      );
    }

    /* ---------------------------
       CREATE OR GET USER
    ---------------------------- */

    const { data: userData, error } =
      await supabaseAdmin.auth.admin.createUser({
        phone: phone,
        phone_confirm: true,
        user_metadata: {
          role: "Worker",
        },
      });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: corsHeaders }
      );
    }

    const userId = userData.user.id;

    /* ---------------------------
       UPDATE USER TABLE
    ---------------------------- */

    await supabaseAdmin
      .from("user")
      .update({ phone_verified: true })
      .eq("id", userId);

    /* ---------------------------
       CREATE SESSION
    ---------------------------- */

    const { data: sessionData } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        phone: phone,
      });

    return new Response(
      JSON.stringify({
        verified: true,
        user_id: userId,
        session: sessionData,
      }),
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