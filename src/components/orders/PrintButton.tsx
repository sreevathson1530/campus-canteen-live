"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the browser's print dialog, where "Save as PDF" is available. */
export function PrintButton() {
  return (
    <Button variant="outline" className="h-10 rounded-full px-4 font-semibold" onClick={() => window.print()}>
      <Printer /> Print / Save PDF
    </Button>
  );
}
