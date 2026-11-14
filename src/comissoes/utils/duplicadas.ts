import { ServiceItem } from '../types';

// Serviço duplicado = mesma nota + mesmo item lançados mais de uma vez na comissão do colaborador
// (ignora cancelados). A linha mais antiga é a "original" (fica); as demais são as "extras".
export interface DuplicadasInfo {
  duplicadasIds: Set<string>; // original + extras de cada grupo duplicado
  extrasIds: Set<string>; // só as linhas a mais (candidatas a excluir)
  originaisIds: Set<string>; // a mais antiga de cada grupo duplicado
  qtdPorId: Record<string, number>; // quantas linhas o grupo do serviço tem
}

export function detectarServicosDuplicados(services: ServiceItem[]): DuplicadasInfo {
  const grupos = new Map<string, ServiceItem[]>();
  services.forEach((sv) => {
    if (!sv.origemNotaId || sv.status === 'CANCELADO') return;
    const chave = `${sv.origemNotaId}#${sv.origemItemIndex ?? ''}`;
    const lista = grupos.get(chave) || [];
    lista.push(sv);
    grupos.set(chave, lista);
  });
  const duplicadasIds = new Set<string>();
  const extrasIds = new Set<string>();
  const originaisIds = new Set<string>();
  const qtdPorId: Record<string, number> = {};
  grupos.forEach((lista) => {
    if (lista.length < 2) return;
    const ordenada = [...lista].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    ordenada.forEach((sv, i) => {
      duplicadasIds.add(sv.id);
      qtdPorId[sv.id] = lista.length;
      if (i === 0) originaisIds.add(sv.id); else extrasIds.add(sv.id);
    });
  });
  return { duplicadasIds, extrasIds, originaisIds, qtdPorId };
}
