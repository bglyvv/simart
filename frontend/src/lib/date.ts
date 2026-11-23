const AZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

/** Manual Azerbaijani date formatting — some browsers/ICU builds don't ship
 *  full localized month names for the 'az' locale, so Intl.toLocaleDateString
 *  can silently fall back to a garbled format. This is deterministic instead. */
export function formatAzDate(date: Date) {
  return `${date.getDate()} ${AZ_MONTHS[date.getMonth()]}`;
}

export function formatAzTime(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
