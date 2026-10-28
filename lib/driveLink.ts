// Library download links must be Google Drive links. Drive access is granted per buyer email,
// so these links are safe to publish; open hosts (Mega, direct file URLs) would give the files away.
export function isDriveLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && (url.hostname === "drive.google.com" || url.hostname === "docs.google.com");
  } catch {
    return false;
  }
}
