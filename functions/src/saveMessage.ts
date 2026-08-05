import { getFirestore, Timestamp } from "firebase-admin/firestore";

/**
 * Grava uma mensagem recebida na coleção `messages`, no MESMO formato que o
 * front-end (src/components/Modules.tsx) já espera e escuta em tempo real.
 * Isso é o que faz o CRM criar o lead automaticamente na coluna ENTRADA
 * (regra descrita em AGENTS.md) sem precisar mudar nada no React.
 */
export async function saveIncomingMessage(params: {
  companyId: string;
  phone: string;
  text: string;
  senderName?: string;
  channel: "WhatsApp" | "Instagram" | "Facebook";
}) {
  const db = getFirestore();
  await db.collection("messages").add({
    companyId: params.companyId,
    phone: params.phone,
    text: params.text,
    direction: "incoming",
    senderName: params.senderName || "Cliente",
    channel: params.channel,
    createdAt: Timestamp.now(),
  });

  // Atualiza (ou cria) o "waitingSince" do lead correspondente, se existir,
  // pra badge de "não respondidas" no menu já refletir a mensagem nova.
  const leadSnap = await db
    .collection("leads")
    .where("companyId", "==", params.companyId)
    .where("phone", "==", params.phone)
    .limit(1)
    .get();

  if (!leadSnap.empty) {
    await leadSnap.docs[0].ref.update({
      lastMessageText: params.text,
      lastMessageDirection: "incoming",
      waitingSince: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  // Se não existir lead ainda, o listener do front-end (App.tsx) cria um
  // automaticamente ao detectar essa mensagem 'incoming' mais recente.
}
