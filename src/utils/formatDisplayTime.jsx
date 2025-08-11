// src/utils/formatDisplayTime.js
export default function formatDisplayTime(datetimeValue) {
  if (!datetimeValue) return "";
  const date = new Date(datetimeValue);
  if (isNaN(date)) return datetimeValue;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

