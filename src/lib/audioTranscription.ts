// Ponto de integracao para transcricao de audio (voz -> texto).
//
// Este projeto e' 100% frontend (Vite + Supabase/Firebase client SDKs) e nao tem nenhuma funcao
// de servidor hoje. Chamar uma API de STT (ex: Whisper da OpenAI, Google Speech-to-Text) direto
// do navegador exigiria expor a chave da API no cliente, o que nao e' seguro -- qualquer pessoa
// com acesso ao app conseguiria roubar a chave e gerar custo em nome da empresa.
//
// Pra habilitar transcricao automatica de verdade, e' preciso:
// 1. Criar uma Cloud Function (Firebase) ou Edge Function (Supabase) que recebe a mediaUrl do
//    audio, chama o provedor de STT escolhido usando uma chave guardada so no servidor, e
//    devolve o texto transcrito.
// 2. Trocar a implementacao de transcribeAudioMessage abaixo pela chamada real pra essa function
//    (ex: fetch na URL da function).
//
// Ate essa function existir, essa chamada so devolve um erro explicativo -- e' assim de
// proposito, pra nao fingir uma transcricao que nao aconteceu de verdade.
export async function transcribeAudioMessage(_mediaUrl: string): Promise<string> {
  throw new Error(
    'Transcrição automática ainda não está configurada. É preciso conectar um provedor de voz-para-texto (ex: Whisper) por trás de uma função de servidor antes de usar esse botão.'
  );
}
