/**
 * The pages that exist so the room is never the only way in.
 *
 * A visitor who cannot or will not walk through the garage — a search
 * crawler, an app-store reviewer following a link, somebody on a slow phone —
 * still needs the studio. This page carries the same content the objects in
 * the room open, rendered from the same registries, so the two can never
 * drift apart. The works have their own pages (src/ui/works.ts).
 */
import { PROJECTS, STATE_LABEL, workHref } from '@/data/projects'
import { SITE_CONFIG, contactRows } from '@/data/site'
import { CHARACTERS } from '@/data/characters'

function studio(host: HTMLElement): void {
  const crew = CHARACTERS.map(
    (c) => `<li><b>${c.name}</b><span>${c.trait}</span></li>`,
  ).join('')
  const making = PROJECTS.map(
    (p) => `<li><a href="${workHref(p.id)}">${p.title}</a> <span>${p.kind} · ${STATE_LABEL[p.releaseState]}</span></li>`,
  ).join('')
  const contact = contactRows()
    .map((r) => `<a class="fb-mail" href="${r.href}">${r.value} <span aria-hidden="true">↗</span></a>`)
    .join('')
  host.innerHTML = `
    <section class="fb-block">
      <h2>WHAT WE MAKE</h2>
      <p>An independent game studio in ${SITE_CONFIG.location}. 감정과 캐릭터, 그리고
         그들이 사는 세계를 중심으로 만듭니다.</p>
      <ul class="fb-list">${making}</ul>
    </section>
    <section class="fb-block">
      <h2>DOKKA CREW</h2>
      <ul class="fb-crew">${crew}</ul>
    </section>
    <section class="fb-block" id="contact">
      <h2>CONTACT</h2>
      ${contact || '<p>연락처가 아직 없습니다.</p>'}
    </section>`
}

export function mountFallback(root: ParentNode = document): void {
  const studioHost = root.querySelector<HTMLElement>('[data-fallback-studio]')
  if (studioHost) studio(studioHost)
}
