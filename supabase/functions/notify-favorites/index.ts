import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Invoked by the "notify-favorites" database webhook on public.fuel_prices (INSERT/UPDATE).
// The webhook sends a shared secret in the x-webhook-secret header.
interface WebhookPayload {
  type: "INSERT" | "UPDATE";
  record: { station_id: string; fuel_type: string; price: number | string };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

    // The secret lives in private.webhook_secrets and is embedded in the DB webhook trigger
    const secret = req.headers.get("x-webhook-secret") ?? "";
    const valid = await fetch(`${supabaseUrl}/rest/v1/rpc/check_webhook_secret`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ p_name: "notify-favorites", p_secret: secret }),
    }).then((r) => r.json());
    if (valid !== true) return json({ error: "forbidden" }, 403);

    const { record }: WebhookPayload = await req.json();
    const price = Number(record?.price);
    if (!record || !UUID.test(record.station_id) || !Number.isFinite(price) || typeof record.fuel_type !== "string") {
      return json({ error: "invalid payload" }, 400);
    }

    const [favorites, stations] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/favorites?station_id=eq.${record.station_id}&select=user_id`, { headers }).then((r) => r.json()),
      fetch(`${supabaseUrl}/rest/v1/stations?id=eq.${record.station_id}&select=name`, { headers }).then((r) => r.json()),
    ]);

    if (!Array.isArray(favorites) || favorites.length === 0) return json({ sent: 0 });

    const ids = [...new Set(favorites.map((f: { user_id: string }) => f.user_id))].filter((id) => UUID.test(String(id)));
    if (ids.length === 0) return json({ sent: 0 });

    const users = await fetch(
      `${supabaseUrl}/rest/v1/users?id=in.(${ids.join(",")})&select=expo_push_token`,
      { headers },
    ).then((r) => r.json());

    const tokens: string[] = (Array.isArray(users) ? users : [])
      .map((u: { expo_push_token: unknown }) => u.expo_push_token)
      .filter((t): t is string => typeof t === "string" && t.length > 0);
    if (tokens.length === 0) return json({ sent: 0 });

    const stationName = Array.isArray(stations) && stations[0]?.name ? stations[0].name : "tu estación favorita";
    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title: `Precio actualizado en ${stationName}`,
      body: `${record.fuel_type.toUpperCase()} — $${price.toFixed(2)}. Toca para ver.`,
      data: { stationId: record.station_id, type: "price_update" },
    }));

    // Expo accepts at most 100 messages per request
    for (let i = 0; i < messages.length; i += 100) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
    }

    return json({ sent: tokens.length });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
