export const getYearOptions = ({ past = 10, future = 1 } = {}) => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear + future;
  const totalYears = past + future + 1;

  return Array.from({ length: totalYears }, (_, index) => String(startYear - index));
};

export const mergeYearOptions = (years) =>
  Array.from(new Set(years.filter((year) => /^\d{4}$/.test(String(year)))))
    .map(String)
    .sort((a, b) => Number(b) - Number(a));
