// Usage dates/months are reporting periods, not instants. Slicing the ISO
// string avoids shifting midnight into the previous day/month when the
// browser's timezone differs from UTC (see handoff section 8, "Dates and
// timezone"). Never pass these fields through `new Date(...)` for display.

export function dateKey(isoLike: string): string {
  return isoLike.slice(0, 10);
}

export function monthKey(isoLike: string): string {
  return isoLike.slice(0, 7);
}

// `created_at_utc` is the one field that is a genuine instant and safe to
// localize, as long as the timezone is shown alongside it.
export function formatUtcTimestamp(isoUtc: string): string {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) {
    return isoUtc;
  }

  const timeZoneName = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const formatted = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

  return timeZoneName ? `${formatted} ${timeZoneName}` : formatted;
}

// Formats a YYYY-MM month key as a human label ("May 2018") without any
// timezone conversion, by parsing the components directly.
export function formatMonthLabel(monthKeyValue: string): string {
  const [yearStr, monthStr] = monthKeyValue.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
    return monthKeyValue;
  }
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${monthNames[monthIndex]} ${year}`;
}
