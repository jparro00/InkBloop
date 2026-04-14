import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── HMAC signing (matches Meta's webhook spec) ──────────────────────────────

async function signPayload(rawBody: string, appSecret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return "sha256=" + hex;
}

async function deliverWebhook(webhookUrl: string, payload: unknown, appSecret: string) {
  const rawBody = JSON.stringify(payload);
  const signature = await signPayload(rawBody, appSecret);
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature },
      body: rawBody,
    });
    return { success: res.ok, status: res.status };
  } catch (err) {
    return { success: false, status: null, error: (err as Error).message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Strip the Edge Function prefix to get the sim path
  const fullPath = url.pathname;
  const simIdx = fullPath.indexOf("/sim/");
  if (simIdx === -1) return json({ error: "Not found" }, 404);
  const simPath = fullPath.slice(simIdx + 5); // after /sim/

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Load config
  const { data: cfg } = await supabase.from("sim_config").select("*").eq("id", 1).single();
  if (!cfg) return json({ error: "Simulator not configured" }, 500);

  // ── GET conversations ─────────────────────────────────────────────────────
  if (req.method === "GET" && simPath === "conversations") {
    const { data: convos } = await supabase
      .from("sim_conversations")
      .select("id, platform, participant_psid, updated_time, read_watermark")
      .order("updated_time", { ascending: false });

    const results = [];
    for (const c of convos ?? []) {
      const { data: profile } = await supabase.from("sim_profiles").select("*").eq("psid", c.participant_psid).maybeSingle();

      const { data: msgs } = await supabase
        .from("sim_messages")
        .select("*")
        .eq("conversation_id", c.id)
        .order("timestamp", { ascending: true });

      results.push({
        id: c.id,
        platform: c.platform,
        participant: profile ? {
          psid: profile.psid, name: profile.name,
          instagram: profile.instagram, profilePic: profile.profile_pic,
        } : null,
        updatedTime: c.updated_time,
        readWatermark: c.read_watermark,
        messages: (msgs ?? []).map(m => ({
          mid: m.mid, senderId: m.sender_id, text: m.text,
          attachments: m.attachments, timestamp: m.timestamp, isEcho: m.is_echo,
        })),
      });
    }

    return json(results);
  }

  // ── GET profiles ──────────────────────────────────────────────────────────
  if (req.method === "GET" && simPath === "profiles") {
    const { data: profiles } = await supabase.from("sim_profiles").select("*").order("created_at");
    return json((profiles ?? []).map(p => ({
      psid: p.psid, firstName: p.first_name, lastName: p.last_name,
      name: p.name, platform: p.platform, profilePic: p.profile_pic,
      instagram: p.instagram,
    })));
  }

  // ── GET/POST config ───────────────────────────────────────────────────────
  if (simPath === "config") {
    if (req.method === "GET") {
      return json({
        webhookUrl: cfg.webhook_url, verifyToken: cfg.verify_token,
        appSecret: cfg.app_secret, accessToken: cfg.access_token,
        pageId: cfg.page_id, igUserId: cfg.ig_user_id,
      });
    }
    if (req.method === "POST") {
      const body = await req.json();
      const updates: Record<string, unknown> = {};
      if (body.webhookUrl !== undefined) updates.webhook_url = body.webhookUrl;
      if (body.verifyToken !== undefined) updates.verify_token = body.verifyToken;
      if (body.appSecret !== undefined) updates.app_secret = body.appSecret;
      if (body.accessToken !== undefined) updates.access_token = body.accessToken;
      if (body.pageId !== undefined) updates.page_id = body.pageId;
      if (body.igUserId !== undefined) updates.ig_user_id = body.igUserId;
      if (Object.keys(updates).length > 0) {
        await supabase.from("sim_config").update(updates).eq("id", 1);
      }
      // Re-read and return
      const { data: updated } = await supabase.from("sim_config").select("*").eq("id", 1).single();
      return json({
        webhookUrl: updated!.webhook_url, verifyToken: updated!.verify_token,
        appSecret: updated!.app_secret, accessToken: updated!.access_token,
        pageId: updated!.page_id, igUserId: updated!.ig_user_id,
      });
    }
  }

  // ── POST send — client sends a message ────────────────────────────────────
  if (req.method === "POST" && simPath === "send") {
    const { psid, text, attachments } = await req.json();
    if (!psid || (!text && !attachments)) {
      return json({ error: "psid and (text or attachments) required" }, 400);
    }

    const { data: profile } = await supabase.from("sim_profiles").select("*").eq("psid", psid).maybeSingle();
    if (!profile) return json({ error: "Unknown PSID" }, 400);

    // Find or create conversation
    let { data: conv } = await supabase.from("sim_conversations").select("id, platform").eq("participant_psid", psid).maybeSingle();
    if (!conv) {
      const convId = "t_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      await supabase.from("sim_conversations").insert({
        id: convId, platform: profile.platform, participant_psid: psid, updated_time: Date.now(),
      });
      conv = { id: convId, platform: profile.platform };
    }

    const mid = "m_" + crypto.randomUUID().replace(/-/g, "").slice(0, 22);
    const now = Date.now();
    const businessId = profile.platform === "instagram" ? cfg.ig_user_id : cfg.page_id;

    await supabase.from("sim_messages").insert({
      mid, conversation_id: conv.id, sender_id: psid, recipient_id: businessId,
      text: text || null, attachments: attachments || null, timestamp: now, is_echo: false,
    });
    await supabase.from("sim_conversations").update({ updated_time: now }).eq("id", conv.id);

    // Fire webhook to Ink Bloop's webhook Edge Function
    const objectType = profile.platform === "instagram" ? "instagram" : "page";
    const pageOrIgId = profile.platform === "instagram" ? cfg.ig_user_id : cfg.page_id;

    const messagePayload = {
      object: objectType,
      entry: [{
        id: pageOrIgId, time: now,
        messaging: [{
          sender: { id: psid }, recipient: { id: pageOrIgId }, timestamp: now,
          message: {
            mid,
            ...(text ? { text } : {}),
            ...(attachments?.length ? { attachments } : {}),
          },
        }],
      }],
    };

    const webhookResult = await deliverWebhook(cfg.webhook_url, messagePayload, cfg.app_secret);

    // Fire delivery + read receipts immediately (no setTimeout in Edge Functions)
    const deliveryPayload = {
      object: objectType,
      entry: [{
        id: pageOrIgId, time: Date.now(),
        messaging: [{
          sender: { id: psid }, recipient: { id: pageOrIgId }, timestamp: Date.now(),
          delivery: { mids: [mid], watermark: now },
        }],
      }],
    };
    await deliverWebhook(cfg.webhook_url, deliveryPayload, cfg.app_secret);

    const readPayload = {
      object: objectType,
      entry: [{
        id: pageOrIgId, time: Date.now(),
        messaging: [{
          sender: { id: psid }, recipient: { id: pageOrIgId }, timestamp: Date.now(),
          read: { watermark: now },
        }],
      }],
    };
    await deliverWebhook(cfg.webhook_url, readPayload, cfg.app_secret);

    return json({ success: true, messageId: mid, webhookResult });
  }

  // ── POST contacts — create new contact ────────────────────────────────────
  if (req.method === "POST" && simPath === "contacts") {
    const { name, instagram, platform, profilePic } = await req.json();
    if (!name?.trim() || !platform) return json({ error: "name and platform required" }, 400);

    const parts = name.trim().split(" ");
    const psid = (platform === "instagram" ? "igsid-" : "psid-") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);

    await supabase.from("sim_profiles").insert({
      psid, first_name: parts[0], last_name: parts.slice(1).join(" ") || "",
      name: name.trim(), platform, profile_pic: profilePic || null,
      instagram: instagram || null,
    });

    const convId = "t_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    await supabase.from("sim_conversations").insert({
      id: convId, platform, participant_psid: psid, updated_time: Date.now(),
    });

    const { data: profile } = await supabase.from("sim_profiles").select("*").eq("psid", psid).maybeSingle();
    return json(profile ? {
      psid: profile.psid, firstName: profile.first_name, lastName: profile.last_name,
      name: profile.name, platform: profile.platform, profilePic: profile.profile_pic,
      instagram: profile.instagram,
    } : { psid });
  }

  // ── POST contacts/:psid/avatar ────────────────────────────────────────────
  const avatarMatch = simPath.match(/^contacts\/([^/]+)\/avatar$/);
  if (req.method === "POST" && avatarMatch) {
    const psid = avatarMatch[1];
    const { dataUrl } = await req.json();

    const { data: profile, error } = await supabase
      .from("sim_profiles")
      .update({ profile_pic: dataUrl })
      .eq("psid", psid)
      .select("*")
      .maybeSingle();

    if (error || !profile) return json({ error: "Unknown PSID" }, 404);

    // Fire profile_update webhook
    const profilePayload = {
      object: "profile_update",
      entry: [{
        id: psid, time: Date.now(),
        messaging: [{
          sender: { id: psid },
          profile_update: { name: profile.name, profile_pic: dataUrl },
        }],
      }],
    };
    deliverWebhook(cfg.webhook_url, profilePayload, cfg.app_secret).catch(() => {});

    return json({
      psid: profile.psid, firstName: profile.first_name, lastName: profile.last_name,
      name: profile.name, platform: profile.platform, profilePic: profile.profile_pic,
      instagram: profile.instagram,
    });
  }

  return json({ error: "Not found" }, 404);
});
