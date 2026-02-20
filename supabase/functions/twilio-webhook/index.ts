import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://commandx-craft.lovable.app",
  "https://id-preview--76ab7580-4e0f-4011-980d-d7fa0d216db7.lovable.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

/**
 * Validate Twilio webhook signature using HMAC-SHA256.
 * Twilio computes: HMAC-SHA1(authToken, url + sorted-params).
 * We replicate that here to reject forged webhook calls.
 */
async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  try {
    // Build validation string: url + alphabetically-sorted params concatenated as key+value
    const sortedKeys = Object.keys(params).sort();
    let validationStr = url;
    for (const key of sortedKeys) {
      validationStr += key + (params[key] ?? "");
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(authToken),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(validationStr)
    );

    const computed = btoa(
      String.fromCharCode(...new Uint8Array(signatureBytes))
    );

    return computed === signature;
  } catch (err) {
    console.error("Signature validation error:", err);
    return false;
  }
}

// Extract last 10 digits for flexible matching
function getPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10);
}

interface PossibleSender {
  type: "personnel" | "customer" | "applicant";
  id: string;
  name: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Twilio Signature Validation ---
    // Skip in development if token is not set (shouldn't happen in production)
    if (twilioAuthToken) {
      const twilioSignature = req.headers.get("X-Twilio-Signature") ?? "";
      const requestUrl = req.url;

      // Clone request to read form data for signature validation
      const clonedReq = req.clone();
      const formDataForValidation = await clonedReq.formData();
      const params: Record<string, string> = {};
      for (const [key, value] of formDataForValidation.entries()) {
        params[key] = String(value);
      }

      const isValid = await validateTwilioSignature(
        twilioAuthToken,
        twilioSignature,
        requestUrl,
        params
      );

      if (!isValid) {
        console.error("Invalid Twilio signature — rejecting webhook");
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/xml" } }
        );
      }
    } else {
      console.warn("TWILIO_AUTH_TOKEN not set — skipping signature validation");
    }

    // Parse Twilio webhook payload (form-encoded)
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const body = formData.get("Body") as string;

    console.log(`Incoming SMS from ${from}: ${body}`);

    if (!from || !body) {
      console.error("Missing required fields: From or Body");
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, "Content-Type": "application/xml" } }
      );
    }

    const phoneDigits = getPhoneDigits(from);
    console.log(`Looking for phone digits: ${phoneDigits}`);

    // Find ALL personnel with this phone number
    const { data: allPersonnel } = await supabase
      .from("personnel")
      .select("id, first_name, last_name, phone")
      .not("phone", "is", null);

    const personnelMatches = allPersonnel?.filter(p => 
      p.phone && getPhoneDigits(p.phone) === phoneDigits
    ) || [];

    console.log(`Found ${personnelMatches.length} personnel matches`);

    // Find ALL customers with this phone number
    const { data: allCustomers } = await supabase
      .from("customers")
      .select("id, name, phone")
      .not("phone", "is", null);

    const customerMatches = allCustomers?.filter(c => 
      c.phone && getPhoneDigits(c.phone) === phoneDigits
    ) || [];

    console.log(`Found ${customerMatches.length} customer matches`);

    // Find ALL applicants with this phone number
    const { data: allApplicants } = await supabase
      .from("applicants")
      .select("id, first_name, last_name, phone")
      .not("phone", "is", null);

    const applicantMatches = allApplicants?.filter(a => 
      a.phone && getPhoneDigits(a.phone) === phoneDigits
    ) || [];

    console.log(`Found ${applicantMatches.length} applicant matches`);

    // Build list of possible senders
    const possibleSenders: PossibleSender[] = [
      ...personnelMatches.map(p => ({ 
        type: "personnel" as const, 
        id: p.id, 
        name: `${p.first_name} ${p.last_name}` 
      })),
      ...customerMatches.map(c => ({ 
        type: "customer" as const, 
        id: c.id, 
        name: c.name 
      })),
      ...applicantMatches.map(a => ({ 
        type: "applicant" as const, 
        id: a.id, 
        name: `${a.first_name} ${a.last_name}` 
      }))
    ];

    if (possibleSenders.length === 0) {
      console.warn(`Unknown sender phone: ${phoneDigits}. Message not stored.`);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { ...corsHeaders, "Content-Type": "application/xml" } }
      );
    }

    // Find the most recent conversation with ANY of these people
    let conversationId: string | null = null;
    let senderType: string | null = null;
    let senderId: string | null = null;
    let senderName: string | null = null;

    for (const sender of possibleSenders) {
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, last_message_at")
        .or(`and(participant_1_type.eq.${sender.type},participant_1_id.eq.${sender.id}),and(participant_2_type.eq.${sender.type},participant_2_id.eq.${sender.id})`)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        senderType = sender.type;
        senderId = sender.id;
        senderName = sender.name;
        console.log(`Found existing conversation ${conversationId} for ${senderName}`);
        break;
      }
    }

    // If no existing conversation found, use first match and create new
    if (!conversationId) {
      const firstMatch = possibleSenders[0];
      senderType = firstMatch.type;
      senderId = firstMatch.id;
      senderName = firstMatch.name;

      console.log(`No existing conversation. Creating new for ${senderName}`);

      // Find any user to be the other participant
      const { data: adminUser } = await supabase
        .from("profiles")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (!adminUser) {
        console.error("No user found to create conversation");
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { ...corsHeaders, "Content-Type": "application/xml" } }
        );
      }

      // Create the conversation
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          participant_1_type: "user",
          participant_1_id: adminUser.id,
          participant_2_type: senderType,
          participant_2_id: senderId,
          last_message_at: new Date().toISOString(),
          last_message_preview: body.substring(0, 100),
        })
        .select()
        .single();

      if (convError || !newConversation) {
        console.error("Error creating conversation:", convError);
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
          { headers: { ...corsHeaders, "Content-Type": "application/xml" } }
        );
      }

      conversationId = newConversation.id;
      console.log(`Created new conversation: ${conversationId}`);

      // Create participant records
      await supabase.from("conversation_participants").insert([
        {
          conversation_id: conversationId,
          participant_type: "user",
          participant_id: adminUser.id,
          unread_count: 1,
        },
        {
          conversation_id: conversationId,
          participant_type: senderType,
          participant_id: senderId,
          unread_count: 0,
        },
      ]);
    }

    // Insert the message into conversation_messages
    const { error: msgError } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_id: senderId,
        content: body,
        message_type: "sms",
      });

    if (msgError) {
      console.error("Error inserting message:", msgError);
    } else {
      console.log(`Message inserted into conversation ${conversationId}`);
    }

    // Update conversation metadata
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: body.substring(0, 100),
      })
      .eq("id", conversationId);

    // Increment unread count for other participants
    const { error: rpcError } = await supabase.rpc("increment_unread_count", {
      p_conversation_id: conversationId,
      p_exclude_type: senderType,
      p_exclude_id: senderId,
    });

    if (rpcError) {
      console.error("Error incrementing unread count:", rpcError);
    }

    // Return empty TwiML response (no auto-reply)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { ...corsHeaders, "Content-Type": "application/xml" } }
    );
  } catch (error) {
    console.error("Twilio webhook error:", error);
    
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { ...corsHeaders, "Content-Type": "application/xml" } }
    );
  }
});
