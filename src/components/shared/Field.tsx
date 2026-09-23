import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Input> & { label: string; hint?: string; error?: string; prefix?: string };

/** Labelled input with hint and error text wired to aria-describedby. */
export function Field({ label, hint, error, prefix, id, className, ...props }: Props) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\W+/g, "-");
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={fieldId} className="text-sm font-semibold">
        {label}
      </Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn("h-12 rounded-xl bg-card text-base", prefix && "pl-12", className)}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="text-sm font-medium text-chili">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
