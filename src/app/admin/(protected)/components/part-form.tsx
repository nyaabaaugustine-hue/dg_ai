"use client";

import { useActionState } from "react";
import { createPart, updatePart } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type PartFormProps = {
  manufacturers: { id: string; name: string }[];
  initial?: {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    subcategory?: string | null;
    partNumber?: string | null;
    vehicleSystem?: string | null;
    manufacturerId?: string | null;
    active: boolean;
    aliases: { id: string; alias: string }[];
  };
};

export function PartForm({ manufacturers, initial }: PartFormProps) {
  const action = initial ? updatePart : createPart;
  const [state, formAction, pending] = useActionState<{ error?: string } | null, FormData>(
    async (_prev, formData) => {
      try {
        await action(formData);
        return null;
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to save part." };
      }
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Part name *</Label>
          <Input id="name" name="name" defaultValue={initial?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partNumber">Part number</Label>
          <Input id="partNumber" name="partNumber" defaultValue={initial?.partNumber ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" defaultValue={initial?.category ?? ""} placeholder="e.g. Bajaj Goods" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subcategory">Subcategory</Label>
          <Input id="subcategory" name="subcategory" defaultValue={initial?.subcategory ?? ""} placeholder="e.g. Clutch" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleSystem">Vehicle system</Label>
          <Input id="vehicleSystem" name="vehicleSystem" defaultValue={initial?.vehicleSystem ?? ""} placeholder="e.g. Engine, Brake, Suspension" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manufacturerId">Manufacturer</Label>
          <Select name="manufacturerId" defaultValue={initial?.manufacturerId ?? ""}>
            <SelectTrigger id="manufacturerId">
              <SelectValue placeholder="Select manufacturer" />
            </SelectTrigger>
            <SelectContent>
              {manufacturers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="aliases">
          Aliases (comma-separated) — local names, mechanic terms, slang
        </Label>
        <Input
          id="aliases"
          name="aliases"
          defaultValue={initial ? initial.aliases.map((a) => a.alias).join(", ") : ""}
          placeholder="carb, carburettor, fuel mixer"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="active" name="active" defaultChecked={initial ? initial.active : true} />
        <Label htmlFor="active">Active</Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Create part"}
        </Button>
      </div>
    </form>
  );
}
