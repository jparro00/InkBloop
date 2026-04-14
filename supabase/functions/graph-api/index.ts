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

function metaError(status: number, message: string, code: number, errorSubcode?: number) {
  return json({
    error: { message, type: "OAuthException", code, error_subcode: errorSubcode, fbtrace_id: "sim_" + Date.now().toString(36) },
  }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Path after /functions/v1/graph-api/  →  /v25.0/...
  const fullPath = url.pathname;
  const graphIdx = fullPath.indexOf("/v25.0/");
  if (graphIdx === -1) {
    return json({ error: "Not found" }, 404);
  }
  const graphPath = fullPath.slice(graphIdx + 7); // everything after /v25.0/
  const parts = graphPath.split("/").filter(Boolean);

  // DB client (service role to bypass RLS — sim tables have no RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Load config
  const { data: cfg } = await supabase.from("sim_config").select("*").eq("id", 1).single();
  if (!cfg) return json({ error: "Simulator not configured" }, 500);

  // Validate access token
  const authHeader = req.headers.get("authorization");
  const queryToken = url.searchParams.get("access_token");
  let token: string | null = null;
  if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
  else if (queryToken) token = queryToken;

  if (token !== cfg.access_token) {
    return metaError(401, "Invalid OAuth access token - Cannot parse access token", 190);
  }

  const id = parts[0]; // the first path segment (page ID, conversation ID, PSID, etc.)
  const subResource = parts[1]; // e.g. "messages", "conversations"

  // ── POST /{id}/messages — Send API ────────────────────────────────────────
  if (req.method === "POST" && subResource === "messages") {
    let platform: string;
    if (id === cfg.page_id) platform = "messenger";
    else if (id === cfg.ig_user_id) platform = "instagram";
    else return metaError(400, "(#100) Param id must be a valid Page or Instagram account ID", 100);

    const body = await req.json();
    const { recipient, message, sender_action } = body;

    // Sender action (typing_on, typing_off, mark_seen)
    if (sender_action) {
      if (!recipient?.id) return metaError(400, "(#100) param recipient must be non-empty", 100);
      const { data: profile } = await supabase.from("sim_profiles").select("psid").eq("psid", recipient.id).maybeSingle();
      if (!profile) return metaError(400, "(#100) No matching user found", 100, 2018001);

      if (sender_action === "mark_seen") {
        // Find conversation and set read watermark
        const { data: conv } = await supabase.from("sim_conversations").select("id").eq("participant_psid", recipient.id).maybeSingle();
        if (conv) {
          await supabase.from("sim_conversations").update({ read_watermark: Date.now() }).eq("id", conv.id);
        }
      }
      return json({ recipient_id: recipient.id });
    }

    if (!recipient?.id) return metaError(400, "(#100) param recipient must be non-empty", 100);
    if (!message) return metaError(400, "(#100) param message must be non-empty", 100);

    const { data: profile } = await supabase.from("sim_profiles").select("psid").eq("psid", recipient.id).maybeSingle();
    if (!profile) return metaError(400, "(#100) No matching user found", 100, 2018001);

    // Validate text length
    if (message.text) {
      if (platform === "messenger" && message.text.length > 2000) return metaError(400, "(#100) Message text exceeds 2000 character limit", 100);
      if (platform === "instagram" && new TextEncoder().encode(message.text).byteLength > 1000) return metaError(400, "(#100) Message text exceeds 1000 byte limit", 100);
    }

    // Find or create conversation
    let { data: conv } = await supabase.from("sim_conversations").select("id").eq("participant_psid", recipient.id).maybeSingle();
    if (!conv) {
      const convId = "t_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      await supabase.from("sim_conversations").insert({ id: convId, platform, participant_psid: recipient.id, updated_time: Date.now() });
      conv = { id: convId };
    }

    const mid = "m_" + crypto.randomUUID().replace(/-/g, "").slice(0, 22);
    const now = Date.now();
    const businessId = platform === "instagram" ? cfg.ig_user_id : cfg.page_id;

    let attachments = null;
    if (message.attachment) attachments = [message.attachment];

    await supabase.from("sim_messages").insert({
      mid, conversation_id: conv.id, sender_id: businessId, recipient_id: recipient.id,
      text: message.text || null, attachments, timestamp: now, is_echo: true,
    });
    await supabase.from("sim_conversations").update({ updated_time: now }).eq("id", conv.id);

    return json({ recipient_id: recipient.id, message_id: mid });
  }

  // ── GET /{id}/conversations — Conversations list ──────────────────────────
  if (req.method === "GET" && subResource === "conversations") {
    // id must be page_id or ig_user_id
    let platform: string;
    if (id === cfg.page_id) platform = "messenger";
    else if (id === cfg.ig_user_id) platform = "instagram";
    else return metaError(400, "(#100) Invalid ID", 100);

    const { data: convos } = await supabase
      .from("sim_conversations")
      .select("id, platform, participant_psid, updated_time")
      .eq("platform", platform)
      .order("updated_time", { ascending: false });

    const results = [];
    for (const c of convos ?? []) {
      const { data: profile } = await supabase.from("sim_profiles").select("name").eq("psid", c.participant_psid).maybeSingle();
      results.push({
        id: c.id,
        updated_time: new Date(c.updated_time).toISOString(),
        link: `/t/${c.id}`,
        participants: {
          data: [
            { id: c.participant_psid, name: profile?.name || "Unknown" },
            { id, name: "Ink Bloop" },
          ],
        },
      });
    }

    return json({ data: results, paging: { cursors: { before: "cursor_start", after: "cursor_end" } } });
  }

  // ── GET /{id} — Resource lookup (conversation, message, or profile) ───────
  if (req.method === "GET" && !subResource) {
    const fields = url.searchParams.get("fields")?.split(",");

    // Conversation (t_ prefix)
    if (id.startsWith("t_")) {
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);
      const before = url.searchParams.get("before") || undefined;
      const after = url.searchParams.get("after") || undefined;

      const { data: conv } = await supabase.from("sim_conversations").select("*").eq("id", id).maybeSingle();
      if (!conv) return metaError(404, `(#803) Some of the aliases you requested do not exist: ${id}`, 803);

      const result: Record<string, unknown> = { id: conv.id };

      if (!fields || fields.includes("messages")) {
        // Fetch all messages for this conversation ordered by timestamp
        const { data: allMsgs } = await supabase
          .from("sim_messages")
          .select("*")
          .eq("conversation_id", id)
          .order("timestamp", { ascending: true });

        const msgs = (allMsgs ?? []).map((m, _i) => ({
          id: m.mid,
          created_time: new Date(m.timestamp).toISOString(),
          from: { id: m.sender_id, name: "" },
          to: { data: [{ id: m.recipient_id, name: "" }] },
          message: m.text || "",
          attachments: m.attachments ? { data: m.attachments } : undefined,
        }));

        // Cursor pagination
        let startIdx = 0;
        let endIdx = msgs.length;

        if (!after && !before) {
          startIdx = Math.max(0, msgs.length - limit);
          endIdx = msgs.length;
        } else if (before && !after) {
          const beforeIdx = parseInt(before, 10);
          if (!isNaN(beforeIdx)) { endIdx = beforeIdx; startIdx = Math.max(0, beforeIdx - limit); }
        } else if (after) {
          const idx = parseInt(after, 10);
          if (!isNaN(idx)) startIdx = idx + 1;
        }

        const page = msgs.slice(startIdx, endIdx);
        const hasPrev = startIdx > 0;
        const hasNext = endIdx < msgs.length;

        // Fill in names
        const nameCache: Record<string, string> = {};
        for (const m of page) {
          for (const idStr of [m.from.id, m.to.data[0].id]) {
            if (!nameCache[idStr]) {
              if (idStr === cfg.page_id || idStr === cfg.ig_user_id) {
                nameCache[idStr] = "Ink Bloop";
              } else {
                const { data: p } = await supabase.from("sim_profiles").select("name").eq("psid", idStr).maybeSingle();
                nameCache[idStr] = p?.name || "Unknown";
              }
            }
          }
          m.from.name = nameCache[m.from.id];
          m.to.data[0].name = nameCache[m.to.data[0].id];
        }

        result.messages = {
          data: page,
          paging: { cursors: { before: hasPrev ? String(startIdx) : null, after: hasNext ? String(endIdx) : null } },
        };
      }

      if (!fields || fields.includes("participants")) {
        const { data: profile } = await supabase.from("sim_profiles").select("name").eq("psid", conv.participant_psid).maybeSingle();
        const ownerId = conv.platform === "instagram" ? cfg.ig_user_id : cfg.page_id;
        result.participants = {
          data: [
            { id: conv.participant_psid, name: profile?.name || "Unknown" },
            { id: ownerId, name: "Ink Bloop" },
          ],
        };
      }

      if (!fields || fields.includes("updated_time")) {
        result.updated_time = new Date(conv.updated_time).toISOString();
      }

      return json(result);
    }

    // Message (m_ prefix)
    if (id.startsWith("m_")) {
      const { data: msg } = await supabase.from("sim_messages").select("*").eq("mid", id).maybeSingle();
      if (!msg) return metaError(404, `(#803) Some of the aliases you requested do not exist: ${id}`, 803);

      return json({
        id: msg.mid,
        created_time: new Date(msg.timestamp).toISOString(),
        from: { id: msg.sender_id, name: "" },
        to: { data: [{ id: msg.recipient_id, name: "" }] },
        message: msg.text || "",
        attachments: msg.attachments ? { data: msg.attachments } : undefined,
      });
    }

    // User profile (PSID)
    const { data: profile } = await supabase.from("sim_profiles").select("*").eq("psid", id).maybeSingle();
    if (profile) {
      const result: Record<string, unknown> = { id };
      if (!fields || fields.includes("first_name")) result.first_name = profile.first_name;
      if (!fields || fields.includes("last_name")) result.last_name = profile.last_name;
      if (!fields || fields.includes("name")) result.name = profile.name;
      if (!fields || fields.includes("profile_pic")) {
        result.profile_pic = profile.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=2C2C2C&color=B08CE8&size=200`;
      }
      return json(result);
    }

    return metaError(404, `(#803) Some of the aliases you requested do not exist: ${id}`, 803);
  }

  return json({ error: "Method not allowed" }, 405);
});
