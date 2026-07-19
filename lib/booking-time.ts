export function minutesFromClock(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return (hours * 60) + minutes;
}

export function localDateTimeParts(value: Date | string, timezone: string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const rawHour = get("hour");
  const hour = rawHour === "24" ? "00" : rawHour;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}

export function calendarDayDifference(fromDate: string, toDate: string) {
  const from = Date.parse(`${fromDate}T12:00:00Z`);
  const to = Date.parse(`${toDate}T12:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** Convert a wall-clock date and time in an IANA time zone to a UTC Date. */
export function zonedDateTimeToUtc(date: string, time: string, timezone: string) {
  const targetAsUtc = Date.parse(`${date}T${time}:00Z`);
  let guess = targetAsUtc;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const observed = localDateTimeParts(new Date(guess), timezone);
    const observedAsUtc = Date.parse(`${observed.date}T${observed.time}:00Z`);
    guess += targetAsUtc - observedAsUtc;
  }
  return new Date(guess);
}

export type BookingPolicyWindow = {
  minimum_notice_minutes?: number | null;
  max_advance_days?: number | null;
  same_day_booking?: boolean | null;
};

export function validateBookingWindow(input: {
  date: string;
  time: string;
  timezone: string;
  policy?: BookingPolicyWindow | null;
  now?: Date;
}) {
  const now = input.now || new Date();
  const localNow = localDateTimeParts(now, input.timezone);
  const dayDifference = calendarDayDifference(localNow.date, input.date);
  const maxAdvance = Number(input.policy?.max_advance_days ?? 60);
  const minimumNotice = Number(input.policy?.minimum_notice_minutes ?? 0);
  const appointmentUtc = zonedDateTimeToUtc(input.date, input.time, input.timezone);

  if (dayDifference < 0 || appointmentUtc.getTime() <= now.getTime()) {
    return { valid: false, reason: "That appointment time has already passed.", appointmentUtc, dayDifference };
  }
  if (dayDifference === 0 && input.policy?.same_day_booking === false) {
    return { valid: false, reason: "This barber does not accept same-day bookings.", appointmentUtc, dayDifference };
  }
  if (dayDifference > maxAdvance) {
    return { valid: false, reason: "That date is beyond the barber’s advance-booking window.", appointmentUtc, dayDifference };
  }
  if (appointmentUtc.getTime() < now.getTime() + minimumNotice * 60_000) {
    return { valid: false, reason: "That time is inside the barber’s minimum booking notice.", appointmentUtc, dayDifference };
  }
  return { valid: true, reason: "", appointmentUtc, dayDifference };
}
