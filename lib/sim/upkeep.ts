import {
  BILL_COUNCIL_PENCE,
  BILL_HEATING_OFF_PENCE,
  BILL_HEATING_ON_PENCE,
  BILL_PHONE_PENCE,
  OVERDRAFT_DAILY_RATE,
  OVERDRAFT_LIMIT_PENCE,
} from "./constants";

export function overdraftInterest(balancePence: number, gameDays: number): number {
  if (balancePence >= 0 || gameDays <= 0) return 0;
  return Math.ceil(Math.abs(balancePence) * OVERDRAFT_DAILY_RATE * gameDays);
}

export function weeklyBills(rentPence: number, heatingOn: boolean, sofa: boolean): number {
  const rent = sofa ? 0 : rentPence;
  const heating = heatingOn ? BILL_HEATING_ON_PENCE : BILL_HEATING_OFF_PENCE;
  return rent + heating + BILL_COUNCIL_PENCE + BILL_PHONE_PENCE;
}

export function applyUpkeep(
  balancePence: number,
  weeks: number,
  gameDays: number,
  rentPence: number,
  heatingOn: boolean,
  sofa: boolean,
): { total: number; nextBalance: number; missed: boolean; interest: number } {
  const interest = overdraftInterest(balancePence, gameDays);
  const bills = weeks > 0 ? weeklyBills(rentPence, heatingOn, sofa) * weeks : 0;
  const total = bills + interest;
  if (total === 0) return { total: 0, nextBalance: balancePence, missed: false, interest: 0 };
  const next = balancePence - total;
  if (next < -OVERDRAFT_LIMIT_PENCE) {
    return {
      total,
      nextBalance: -OVERDRAFT_LIMIT_PENCE,
      missed: weeks > 0,
      interest,
    };
  }
  return { total, nextBalance: next, missed: false, interest };
}
