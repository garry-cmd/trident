"use client";
import { C } from "@/lib/theme";

// Status → token. "off" (a gated/absent sensor) reads dim, not alarming.
export const statusColor = (s) =>
  s === "danger" ? C.dangerBr : s === "caution" ? C.cautionBr : s === "off" ? C.dim : C.safeBr;

export const statusBorder = (s) =>
  s === "danger" ? C.danger : s === "caution" ? C.caution : s === "off" ? C.dim : C.safeBr;
