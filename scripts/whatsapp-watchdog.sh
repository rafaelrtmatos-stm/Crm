#!/usr/bin/env bash
# Vigia o recebimento do WhatsApp e age quando a sessão da Evolution trava.
#
# Problema: a Evolution às vezes continua "open" e envia normalmente, mas para de RECEBER
# (stream errored out -> conexão zumbi). Ninguém percebe por horas.
#
# O que faz (rodar no servidor da Evolution, via cron, a cada 5 minutos):
#   1. Consulta no Supabase a data da última mensagem RECEBIDA em crm_messages.
#   2. Se passou do limite (padrão 10 min) dentro do horário configurado (padrão 7h-22h Santarém):
#        a) reinicia o container da Evolution (até MAX_REINICIOS por episódio);
#        b) manda um aviso no seu WhatsApp pela própria Evolution (o ENVIO costuma funcionar mesmo travado);
#        c) se o reinício não resolveu, avisa que é preciso refazer o QR.
#   3. Quando volta a receber, avisa que normalizou.
#
# Instalação (no servidor):
#   sudo cp scripts/whatsapp-watchdog.sh /usr/local/bin/whatsapp-watchdog.sh && sudo chmod +x /usr/local/bin/whatsapp-watchdog.sh
#   sudo cp scripts/whatsapp-watchdog.env.example /etc/whatsapp-watchdog.env && sudo chmod 600 /etc/whatsapp-watchdog.env
#   sudo nano /etc/whatsapp-watchdog.env        # preencher as chaves (NUNCA commitar esse arquivo)
#   sudo DRY_RUN=1 /usr/local/bin/whatsapp-watchdog.sh     # teste: só mostra o que faria
#   crontab -e  ->  */5 * * * * /usr/local/bin/whatsapp-watchdog.sh >> /var/log/whatsapp-watchdog.log 2>&1
#   (o usuário do cron precisa poder rodar "docker"; se não puder, use o crontab do root)

set -u

CONFIG="${WATCHDOG_CONFIG:-/etc/whatsapp-watchdog.env}"
[ -f "$CONFIG" ] && . "$CONFIG"

: "${SUPABASE_URL:?defina SUPABASE_URL em $CONFIG}"
: "${SUPABASE_KEY:?defina SUPABASE_KEY em $CONFIG}"
: "${EVOLUTION_URL:=http://localhost:8080}"
: "${EVOLUTION_APIKEY:?defina EVOLUTION_APIKEY em $CONFIG}"
: "${INSTANCE:=rafa-arts}"
: "${CONTAINER:=evolution_api}"
: "${ALERT_NUMBER:=}"            # seu número com DDI, só dígitos (ex.: 5593999999999). Vazio = não avisa.
: "${LIMITE_MIN:=10}"            # minutos sem mensagem recebida para considerar travado
: "${HORA_INICIO:=7}"
: "${HORA_FIM:=22}"
: "${MAX_REINICIOS:=2}"          # reinícios automáticos por episódio de travamento
: "${ESPERA_APOS_REINICIO:=180}" # segundos antes de reavaliar depois de reiniciar
: "${TZ_LOCAL:=America/Belem}"
: "${ESTADO:=/var/tmp/whatsapp-watchdog.state}"
DRY_RUN="${DRY_RUN:-0}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [watchdog] $*"; }

# --- estado persistente: REINICIOS (no episódio atual), AVISO_QR (epoch do último pedido de QR), EM_ALERTA (0/1) ---
REINICIOS=0; AVISO_QR=0; EM_ALERTA=0
[ -f "$ESTADO" ] && . "$ESTADO"
salvar_estado() {
  printf 'REINICIOS=%s\nAVISO_QR=%s\nEM_ALERTA=%s\n' "$REINICIOS" "$AVISO_QR" "$EM_ALERTA" > "$ESTADO"
}

avisar() {
  local texto="$1"
  log "AVISO: $texto"
  [ -z "$ALERT_NUMBER" ] && return 0
  [ "$DRY_RUN" = "1" ] && { log "(dry-run) não enviei o aviso"; return 0; }
  # Usa JSON simples; o texto não deve conter aspas duplas.
  curl -s -m 20 -X POST "$EVOLUTION_URL/message/sendText/$INSTANCE" \
    -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
    -d "{\"number\":\"$ALERT_NUMBER\",\"text\":\"$texto\"}" > /dev/null \
    || log "não consegui enviar o aviso pelo WhatsApp"
}

# --- última mensagem recebida (data ISO) ---
resp=$(curl -s -m 20 "$SUPABASE_URL/rest/v1/crm_messages?select=created_at&direction=eq.incoming&order=created_at.desc&limit=1" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY")
ultima=$(printf '%s' "$resp" | grep -o '"created_at":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$ultima" ]; then
  log "não consegui ler a última mensagem no Supabase (resposta: ${resp:0:120}). Nada a fazer."
  exit 0
fi
ultima_epoch=$(date -d "$ultima" +%s 2>/dev/null) || { log "data inválida: $ultima"; exit 0; }
agora=$(date +%s)
min=$(( (agora - ultima_epoch) / 60 ))

hora=$(TZ="$TZ_LOCAL" date +%-H)
dentro_horario=1
{ [ "$hora" -lt "$HORA_INICIO" ] || [ "$hora" -ge "$HORA_FIM" ]; } && dentro_horario=0

# --- normalizou ---
if [ "$min" -lt "$LIMITE_MIN" ]; then
  if [ "$EM_ALERTA" = "1" ]; then
    avisar "CRM: o WhatsApp voltou a receber mensagens (última há ${min} min)."
  fi
  REINICIOS=0; EM_ALERTA=0; salvar_estado
  log "ok: última mensagem recebida há ${min} min"
  exit 0
fi

# --- parado ---
if [ "$dentro_horario" = "0" ]; then
  log "fora do horário (${hora}h); última mensagem há ${min} min. Sem ação."
  exit 0
fi

log "SEM mensagens recebidas há ${min} min (limite ${LIMITE_MIN})."

if [ "$REINICIOS" -lt "$MAX_REINICIOS" ]; then
  REINICIOS=$((REINICIOS + 1)); EM_ALERTA=1
  avisar "CRM: sem mensagens recebidas ha ${min} min. Reiniciando a Evolution (tentativa ${REINICIOS} de ${MAX_REINICIOS})."
  if [ "$DRY_RUN" = "1" ]; then
    log "(dry-run) rodaria: docker restart $CONTAINER"
  else
    docker restart "$CONTAINER" >/dev/null 2>&1 && log "container $CONTAINER reiniciado" || log "FALHA ao reiniciar $CONTAINER"
  fi
  salvar_estado
  # Dá tempo da conexão subir; a próxima execução do cron reavalia.
  [ "$DRY_RUN" = "1" ] || sleep "$ESPERA_APOS_REINICIO"
  exit 0
fi

# Reinícios esgotados: pede QR novo, sem repetir o aviso a cada 5 min (no máximo 1x por hora).
EM_ALERTA=1
if [ $((agora - AVISO_QR)) -ge 3600 ]; then
  avisar "CRM: o WhatsApp segue sem receber ha ${min} min e o reinicio automatico nao resolveu. Refaca a conexao pelo QR code (Desconectar e escanear)."
  AVISO_QR=$agora
fi
salvar_estado
exit 0
