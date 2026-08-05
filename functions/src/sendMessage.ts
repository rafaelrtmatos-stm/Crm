const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Envia uma mensagem de texto via WhatsApp Cloud API.
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */
export async function sendWhatsAppText(params: {
  phoneNumberId: string;
  accessToken: string;
  toPhoneE164: string; // ex: 5593999998888 (sem "+", com DDI)
  text: string;
}): Promise<{ ok: boolean; error?: string; raw?: any }> {
  const url = `${GRAPH_BASE}/${params.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.toPhoneE164,
      type: "text",
      text: { body: params.text },
    }),
  });
  const raw: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: raw?.error?.message || `HTTP ${res.status}`, raw };
  }
  return { ok: true, raw };
}

/**
 * Envia uma mensagem de texto via Messenger Platform.
 * Funciona tanto pra Facebook Messenger quanto pra Instagram Direct — a
 * diferença é só o Page Access Token e o recipientId (PSID do Messenger
 * ou IGSID do Instagram), a chamada é a mesma.
 * Documentação: https://developers.facebook.com/docs/messenger-platform/reference/send-api
 */
export async function sendMessengerText(params: {
  pageAccessToken: string;
  recipientId: string; // PSID (Messenger) ou IGSID (Instagram)
  text: string;
}): Promise<{ ok: boolean; error?: string; raw?: any }> {
  const url = `${GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(
    params.pageAccessToken
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: params.recipientId },
      message: { text: params.text },
    }),
  });
  const raw: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: raw?.error?.message || `HTTP ${res.status}`, raw };
  }
  return { ok: true, raw };
}
