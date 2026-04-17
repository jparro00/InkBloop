import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Groq Whisper API. Max file size 25MB (we never get close — 15s clip is ~250KB).
const GROQ_TRANSCRIBE_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "whisper-large-v3-turbo";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth — same pattern as agent-parse. Requires a valid Supabase user session.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Shared server-side Groq API key. Set via:
    //   npx supabase secrets set GROQ_API_KEY=<key> --project-ref <ref>
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // The client posts the raw audio blob as the request body. We re-wrap it
    // in a multipart/form-data request to Groq (their API doesn't accept raw
    // bytes directly — requires a File upload).
    const contentType = req.headers.get("content-type") || "audio/webm";
    const audioBytes = await req.arrayBuffer();

    if (audioBytes.byteLength === 0) {
      return new Response(JSON.stringify({ error: "Empty audio body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick a file extension that matches the content-type so Groq can decode.
    const extFromType = (t: string) => {
      if (t.includes("webm")) return "webm";
      if (t.includes("mp4")) return "mp4";
      if (t.includes("aac")) return "aac";
      if (t.includes("wav")) return "wav";
      if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
      if (t.includes("ogg")) return "ogg";
      return "webm";
    };
    const ext = extFromType(contentType);

    const form = new FormData();
    form.append(
      "file",
      new File([audioBytes], `audio.${ext}`, { type: contentType })
    );
    form.append("model", GROQ_MODEL);
    form.append("response_format", "json");
    // temperature=0 for deterministic transcription
    form.append("temperature", "0");

    const groqResp = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: form,
    });

    if (!groqResp.ok) {
      const errText = await groqResp.text();
      return new Response(
        JSON.stringify({
          error: `Groq API error: ${groqResp.status}`,
          details: errText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await groqResp.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
