function invalid(message) { return Object.assign(new Error(message), { status: 400 }); }
function text(value, field, max = 200, required = true) {
  if (typeof value !== 'string') {
    if (!required && value === undefined) return '';
    throw invalid(field + ' must be text.');
  }
  const result = value.trim();
  if ((required && !result) || result.length > max) throw invalid(field + ' must contain 1–' + max + ' characters.');
  return result;
}
function email(value) {
  const result = text(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw invalid('Enter a valid email address.');
  return result;
}
function password(value) {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value) > 72) {
    throw invalid('Password must be at least 8 characters and at most 72 bytes.');
  }
  return value;
}
function nonNegative(value, field) {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') throw invalid(field + ' is required.');
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 365000) throw invalid(field + ' must be a non-negative number.');
  return number;
}
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
module.exports = { invalid, text, email, password, nonNegative, escapeRegex };
