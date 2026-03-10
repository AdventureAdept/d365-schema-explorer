export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeForAttribute(unsafe: string): string {
  if (!unsafe) return '';
  return escapeHtml(unsafe)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeForScript(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026");
}
