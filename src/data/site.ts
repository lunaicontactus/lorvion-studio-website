/**
 * The one place contact details live.
 *
 * A field left null is a field we do not have. Nothing here is invented: the
 * email is the address already used across the legal pages, and there is no
 * phone number anywhere in this repository, so `phone` stays null and the TV
 * simply does not show a phone row. Filling it in is the only change needed.
 */
export interface SiteConfig {
  readonly companyName: string
  readonly location: string
  readonly email: string | null
  readonly phone: string | null
  readonly instagram: string | null
  readonly youtube: string | null
}

export const SITE_CONFIG: SiteConfig = {
  companyName: 'EUNGARAGE',
  location: 'Seoul, Republic of Korea',
  email: 'eungarage@gmail.com',
  phone: null,
  instagram: null,
  youtube: null,
}

/** Contact rows the TV can actually show, in display order. */
export function contactRows(): { key: string; label: string; value: string; href: string }[] {
  const rows: { key: string; label: string; value: string; href: string }[] = []
  if (SITE_CONFIG.email) {
    rows.push({ key: 'email', label: 'EMAIL', value: SITE_CONFIG.email, href: `mailto:${SITE_CONFIG.email}` })
  }
  if (SITE_CONFIG.phone) {
    rows.push({ key: 'phone', label: 'PHONE', value: SITE_CONFIG.phone, href: `tel:${SITE_CONFIG.phone.replace(/[^\d+]/g, '')}` })
  }
  if (SITE_CONFIG.instagram) {
    rows.push({ key: 'instagram', label: 'INSTAGRAM', value: SITE_CONFIG.instagram, href: SITE_CONFIG.instagram })
  }
  if (SITE_CONFIG.youtube) {
    rows.push({ key: 'youtube', label: 'YOUTUBE', value: SITE_CONFIG.youtube, href: SITE_CONFIG.youtube })
  }
  return rows
}
