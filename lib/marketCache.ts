const EASTERN_TIME_ZONE = "America/New_York";
const DEFAULT_REFRESH_WINDOWS = ["09:30", "12:00", "15:30"];

type EasternParts = {
  year: number;
  month: number;
  day: number;
  weekday: string;
  minutes: number;
};

const easternFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EASTERN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function getEasternParts(date = new Date()): EasternParts {
  const parts = easternFormatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    weekday: lookup.weekday,
    minutes: Number(lookup.hour) * 60 + Number(lookup.minute),
  };
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getPreviousBusinessDay(year: number, month: number, day: number) {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() - 1);

  while (utcDate.getUTCDay() === 0 || utcDate.getUTCDay() === 6) {
    utcDate.setUTCDate(utcDate.getUTCDate() - 1);
  }

  return formatDateParts(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate()
  );
}

function parseRefreshWindows() {
  const configured = process.env.RAW_CACHE_REFRESH_WINDOWS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const windows = configured?.length ? configured : DEFAULT_REFRESH_WINDOWS;

  return windows
    .map((value) => {
      const [hourText, minuteText = "0"] = value.split(":");
      const hour = Number(hourText);
      const minute = Number(minuteText);

      if (
        !Number.isInteger(hour) ||
        !Number.isInteger(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
      ) {
        throw new Error(
          `Invalid RAW_CACHE_REFRESH_WINDOWS value "${value}". Expected HH:MM in America/New_York time.`
        );
      }

      return {
        label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        minutes: hour * 60 + minute,
      };
    })
    .sort((left, right) => left.minutes - right.minutes);
}

export function getRawMarketCacheContext(now = new Date()) {
  const eastern = getEasternParts(now);
  const refreshWindows = parseRefreshWindows();
  const currentDate = formatDateParts(eastern.year, eastern.month, eastern.day);
  const previousTradingDate = getPreviousBusinessDay(
    eastern.year,
    eastern.month,
    eastern.day
  );
  const isWeekend = eastern.weekday === "Sat" || eastern.weekday === "Sun";

  if (isWeekend || eastern.minutes < refreshWindows[0].minutes) {
    return {
      dateStr: previousTradingDate,
      slot: refreshWindows[refreshWindows.length - 1].label,
      refreshWindows,
    };
  }

  let slot = refreshWindows[0].label;

  for (const refreshWindow of refreshWindows) {
    if (eastern.minutes >= refreshWindow.minutes) {
      slot = refreshWindow.label;
    }
  }

  return {
    dateStr: currentDate,
    slot,
    refreshWindows,
  };
}

