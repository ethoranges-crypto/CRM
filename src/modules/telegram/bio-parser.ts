/**
 * Extract company name from a Telegram bio string.
 *
 * Examples:
 * - "Lead BD of Alchemix" → "Alchemix"
 * - "Growth @ Aave" → "Aave"
 * - "Working at Compound Finance" → "Compound Finance"
 * - "Lido | Business Development" → "Lido"
 * - "Business Development | Lido" → "Lido"
 * - "CEO from MakerDAO" → "MakerDAO"
 */
export function parseCompanyFromBio(
  bio: string | null | undefined
): string | null {
  if (!bio) return null

  const cleaned = bio.trim()
  if (!cleaned) return null

  // Pattern 1: "X at/of/from Company" (company starts with uppercase)
  const prepositionPatterns = [
    /\bat\s+([A-Z][\w&.'/-]+(?:\s+[A-Z][\w&.'/-]+)*)/,
    /\bof\s+([A-Z][\w&.'/-]+(?:\s+[A-Z][\w&.'/-]+)*)/,
    /\bfrom\s+([A-Z][\w&.'/-]+(?:\s+[A-Z][\w&.'/-]+)*)/,
  ]

  for (const pattern of prepositionPatterns) {
    const match = cleaned.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  // Pattern 2: "X @ Company"
  const atSymbol = cleaned.match(/@\s*([A-Z][\w&.'/-]+(?:\s+[A-Z][\w&.'/-]+)*)/)
  if (atSymbol?.[1]) {
    return atSymbol[1].trim()
  }

  // Pattern 3: "Company | Role" or "Role | Company"
  // Try to find the part that looks like a company name (capitalized, shorter)
  const pipeParts = cleaned.split(/\s*\|\s*/)
  if (pipeParts.length === 2) {
    // Heuristic: the shorter part is more likely the company
    // and it should start with uppercase
    const candidates = pipeParts
      .map((p) => p.trim())
      .filter((p) => /^[A-Z]/.test(p))
      .sort((a, b) => a.length - b.length)

    if (candidates.length > 0) {
      return candidates[0]
    }
  }

  // Pattern 4: "Company - Role" or "Role - Company"
  const dashParts = cleaned.split(/\s*[-–—]\s*/)
  if (dashParts.length === 2) {
    const candidates = dashParts
      .map((p) => p.trim())
      .filter((p) => /^[A-Z]/.test(p))
      .sort((a, b) => a.length - b.length)

    if (candidates.length > 0) {
      return candidates[0]
    }
  }

  return null
}
