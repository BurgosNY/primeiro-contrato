export function normalizeCnpj(value: string) {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function findCnpj(value: string) {
  const matches = value.match(/\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}|\d{14}/g) ?? [];
  return matches.map(normalizeCnpj).find((item) => item.length === 14) ?? "";
}

export function isValidCnpj(value: string) {
  const cnpj = normalizeCnpj(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const digit = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((total, item, index) => total + Number(item) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = digit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(cnpj.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${first}${second}`);
}
