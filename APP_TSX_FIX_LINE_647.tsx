// ============================================================
// CORREÇÃO PARA src/App.tsx
// Substitua o useEffect das linhas 641-653 por este código
// ============================================================

useEffect(() => {
  if (!currentCompany) {
    setUnrepliedLeadsCount(0);
    return;
  }

  const loadCount = async () => {
    try {
      // ✅ CORRIGIDO: 'rafa-arts' → currentCompany.id
      const { data, error } = await supabase
        .from('leads')
        .select('waiting_since')
        .eq('company_id', currentCompany.id);  // Antes: 'rafa-arts'

      if (error) {
        console.error('❌ Erro ao carregar leads não respondidos:', error);
        setUnrepliedLeadsCount(0);
        return;
      }

      // Filtra leads que têm waiting_since preenchido (aguardando resposta)
      const count = (data || []).filter(
        (r: any) => r.waiting_since !== null && r.waiting_since !== undefined
      ).length;

      setUnrepliedLeadsCount(count);
    } catch (err) {
      console.error('❌ Erro ao carregar leads não respondidos:', err);
      setUnrepliedLeadsCount(0);
    }
  };

  loadCount();

  // Realtime subscription — já estava correto, mantém como está
  const channel = supabase
    .channel('app-unreplied-count')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `company_id=eq.${currentCompany.id}`,
      },
      loadCount
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [currentCompany]);

// ============================================================
// RESUMO DE MUDANÇAS:
// ============================================================
// 1. Mudou .eq('company_id', 'rafa-arts') para .eq('company_id', currentCompany.id)
// 2. Adicionou verificação de error do Supabase
// 3. Adicionou try/catch para erros de rede
// 4. Logs de erro claros em vez de falhar silenciosamente
// 5. Dependência [currentCompany] já estava correta
// ============================================================
