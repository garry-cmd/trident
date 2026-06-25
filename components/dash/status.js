"use client";
import { C } from "@/lib/theme";

// Status → token. "off" (a gated/absent sensor) reads dim, not alarming.
export const statusColor = (s) =>
  s === "danger" ? C.dangerBr : s === "caution" ? C.cautionBr : s === "off" ? C.dim : C.safeBr;

export const statusBorder = (s) =>
  s === "danger" ? C.danger : s === "caution" ? C.caution : s === "off" ? C.dim : C.safeBr;

// Status → glow halo. Only caution/danger glow; calm/off/safe return null and
// stay flat, so a lit halo on the strip always means "this one needs your eyes."
export const statusGlow = (s) =>
  s === "danger" ? C.glowDanger : s === "caution" ? C.glowCaution : null;
