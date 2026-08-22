// Utilitários de data que usam o fuso horário LOCAL do usuário.
// Evita o bug de `toISOString()`, que converte para UTC e pode
// fazer a data "pular" para o dia seguinte (ex: sexta virando sábado)
// dependendo do horário e do fuso do dispositivo.

export const toLocalISO = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayISO = (): string => toLocalISO(new Date());
