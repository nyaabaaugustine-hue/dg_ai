"use client";

import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

export function useParts(params?: { page?: number; limit?: number; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.search) searchParams.set("search", params.search);
  
  const key = `/api/admin/parts${searchParams.toString() ? `?${searchParams}` : ""}`;
  return useSWR(key, fetcher);
}

export function usePart(id: string) {
  return useSWR(id ? `/api/admin/parts/${id}` : null, fetcher);
}

export function useManufacturers() {
  return useSWR("/api/admin/manufacturers", fetcher);
}

export function useVehicles() {
  return useSWR("/api/admin/vehicles", fetcher);
}

export function useCompatibilities(partId?: string, vehicleId?: string) {
  const searchParams = new URLSearchParams();
  if (partId) searchParams.set("partId", partId);
  if (vehicleId) searchParams.set("vehicleId", vehicleId);
  
  const key = `/api/admin/compatibilities${searchParams.toString() ? `?${searchParams}` : ""}`;
  return useSWR(key, fetcher);
}

export function useAliases(partId?: string) {
  const key = partId ? `/api/admin/aliases?partId=${partId}` : "/api/admin/aliases";
  return useSWR(key, fetcher);
}

export function useConversations(params?: { page?: number; limit?: number; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.search) searchParams.set("search", params.search);
  
  const key = `/api/admin/conversations${searchParams.toString() ? `?${searchParams}` : ""}`;
  return useSWR(key, fetcher);
}

export function useConversation(id: string) {
  return useSWR(id ? `/api/admin/conversations/${id}` : null, fetcher);
}

export function useFeedback(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  
  const key = `/api/admin/feedback${searchParams.toString() ? `?${searchParams}` : ""}`;
  return useSWR(key, fetcher);
}

export function usePrices() {
  return useSWR("/api/admin/prices", fetcher);
}

export function useMutateParts() {
  return () => mutate((key) => typeof key === "string" && key.startsWith("/api/admin/parts"));
}

export function useMutateManufacturers() {
  return () => mutate((key) => typeof key === "string" && key.startsWith("/api/admin/manufacturers"));
}

export function useMutateVehicles() {
  return () => mutate((key) => typeof key === "string" && key.startsWith("/api/admin/vehicles"));
}

export function useMutateCompatibilities() {
  return () => mutate((key) => typeof key === "string" && key.startsWith("/api/admin/compatibilities"));
}

export function useMutateAliases() {
  return () => mutate((key) => typeof key === "string" && key.startsWith("/api/admin/aliases"));
}

export function useMutateConversations() {
  return () => mutate((key) => typeof key === "string" && key.startsWith("/api/admin/conversations"));
}

export function useMutateFeedback() {
  return () => mutate((key) => typeof key === "string" && key.startsWith("/api/admin/feedback"));
}

export function useMutatePrices() {
  return () => mutate((key) => typeof key === "string" && key.startsWith("/api/admin/prices"));
}

export async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}