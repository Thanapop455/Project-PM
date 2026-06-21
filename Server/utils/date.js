const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeDateOnly = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
};

const parseDateInput = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return normalizeDateOnly(value);
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  return normalizeDateOnly(text);
};

const getTodayDate = () => {
  const today = new Date();

  return new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );
};

const getUTCDateRange = ({ year, month, startDate, endDate } = {}) => {
  if (startDate && endDate) {
    const start = parseDateInput(startDate);
    const end = parseDateInput(endDate);

    if (!start || !end) {
      return null;
    }

    return {
      gte: start,
      lte: end,
    };
  }

  if (!year) {
    return null;
  }

  const targetYear = Number(year);

  if (!Number.isInteger(targetYear)) {
    return null;
  }

  if (!month) {
    return {
      gte: new Date(Date.UTC(targetYear, 0, 1)),
      lt: new Date(Date.UTC(targetYear + 1, 0, 1)),
    };
  }

  const targetMonth = Number(month);

  if (
    !Number.isInteger(targetMonth) ||
    targetMonth < 1 ||
    targetMonth > 12
  ) {
    return null;
  }

  return {
    gte: new Date(Date.UTC(targetYear, targetMonth - 1, 1)),
    lt: new Date(Date.UTC(targetYear, targetMonth, 1)),
  };
};

const getDaysBetweenDateOnly = (fromDate, toDate) => {
  const from = normalizeDateOnly(fromDate);
  const to = normalizeDateOnly(toDate);

  if (!from || !to) {
    return null;
  }

  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
};

const formatDateOnly = (date) => {
  const value = normalizeDateOnly(date);

  return value ? value.toISOString().slice(0, 10) : null;
};

const getLastDayOfMonth = (year, month) =>
  new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();

module.exports = {
  DAY_MS,
  formatDateOnly,
  getDaysBetweenDateOnly,
  getLastDayOfMonth,
  getTodayDate,
  getUTCDateRange,
  normalizeDateOnly,
  parseDateInput,
};
