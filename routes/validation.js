function isMissing(value) {
  return value === undefined || value === null || value === "";
}

function isBlank(value) {
  return typeof value !== "string" || value.trim() === "";
}

function isValidDate(value) {
  return !isBlank(value) && !Number.isNaN(new Date(value).getTime());
}

function isPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

function isNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

module.exports = {
  isMissing,
  isBlank,
  isValidDate,
  isPositiveInteger,
  isNonNegativeNumber
};
