export function isUrlAllowed(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname

    // Basic block for localhost and private IPv4 ranges
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return false
    }

    // Block basic IPv6 loopback and private ranges
    if (
      hostname === '[::1]' ||
      hostname.startsWith('[fc00:') ||
      hostname.startsWith('[fd00:') ||
      hostname.startsWith('[fe80:') ||
      hostname === '::1' ||
      hostname.startsWith('fc00:') ||
      hostname.startsWith('fd00:') ||
      hostname.startsWith('fe80:')
    ) {
      return false
    }

    return true
  } catch (e) {
    return false
  }
}
