export function formatPence(pence: number): string {
  const negative = pence < 0;
  const abs = Math.abs(Math.trunc(pence));
  const pounds = Math.floor(abs / 100);
  const rem = (abs % 100).toString().padStart(2, "0");
  const body = `${pounds.toLocaleString("en-GB")}.${rem}`;
  return `${negative ? "-" : ""}£${body}`;
}

export function canAfford(balancePence: number, pricePence: number, overdraftLimit: number): boolean {
  return balancePence - pricePence >= -overdraftLimit;
}
