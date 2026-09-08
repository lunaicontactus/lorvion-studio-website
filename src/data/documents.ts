/**
 * The studio's paperwork, in the one place that owns those URLs.
 *
 * These pages are linked from the LUNAI app and read by store reviewers, so
 * the addresses are frozen and the cabinet is only a second way to them — the
 * SUPPORT link in the top navigation still goes straight to the page. Nothing
 * here is hidden behind a puzzle.
 */
export interface DocumentLink {
  readonly id: string
  readonly label: string
  readonly href: string
}

export const DOCUMENTS: readonly DocumentLink[] = [
  { id: 'support', label: 'SUPPORT', href: './support.html' },
  { id: 'privacy', label: 'PRIVACY', href: './privacy.html' },
  { id: 'terms', label: 'TERMS', href: './terms.html' },
  { id: 'community', label: 'COMMUNITY GUIDELINES', href: './community-guidelines.html' },
  { id: 'account-deletion', label: 'ACCOUNT DELETION', href: './account-deletion.html' },
]
