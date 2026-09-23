const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** 12345600 paise -> "₹1,23,456". Paise are shown only when non-zero. */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${inr.format(rupees)}`;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
