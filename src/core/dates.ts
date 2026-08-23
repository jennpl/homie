import type { OrganizationWindow } from "../contracts/organization.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function localDateFor(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dayWindow(localDate: string): OrganizationWindow {
  assertDate(localDate);
  const next = new Date(`${localDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    kind: "day",
    startDate: localDate,
    endDateExclusive: next.toISOString().slice(0, 10),
  };
}

export function validateWindow(window: OrganizationWindow): void {
  assertDate(window.startDate);
  assertDate(window.endDateExclusive);
  if (window.endDateExclusive <= window.startDate) {
    throw new Error("Organization window end must be after its start");
  }
}

function assertDate(value: string): void {
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Invalid local date: ${value}`);
  }
}
