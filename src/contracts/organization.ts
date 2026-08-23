export type OrganizationWindow = {
  kind: "day" | "week" | "month";
  startDate: string;
  endDateExclusive: string;
};

export type OrganizeReason = "note.created" | "manual" | "scheduled" | "retry";

export type OrganizeInput = {
  householdId: string;
  window: OrganizationWindow;
  reason: OrganizeReason;
};

export type OrganizationResult = {
  summary: {
    text: string;
    sourceNoteIds: string[];
  };
  planItems: Array<{
    title: string;
    details: string;
    status: "action" | "information";
    sourceNoteIds: string[];
  }>;
  digestText: string;
};

export type OrganizationSnapshot = OrganizationResult & {
  id: string;
  householdId: string;
  window: OrganizationWindow;
  version: number;
  sourceNoteIds: string[];
  reason: OrganizeReason;
  model: string;
  createdAt: string;
};
