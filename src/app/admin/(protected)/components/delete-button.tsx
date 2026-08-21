"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  action,
  id,
  label = "Delete",
  iconOnly = true,
}: {
  action: (id: string) => Promise<void>;
  id: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(`Are you sure you want to ${label.toLowerCase()}? This cannot be undone.`)) {
          startTransition(() => action(id));
        }
      }}
    >
      {iconOnly ? <Trash2 className="h-4 w-4" /> : label}
    </Button>
  );
}
