/**
 * The pages that exist so the room is never the only way in.
 *
 * A visitor who cannot or will not walk through the garage — a search
 * crawler, an app-store reviewer following a link, somebody on a slow phone —
 * still needs the games and the studio. These pages carry the same content the
 * objects in the room open, rendered from the same registries, so the two can
 * never drift apart.
 */
import { PROJECTS } from '@/data/projects'
import { SITE_CONFIG, contactRows } from '@/data/site'
import { CHARACTERS } from '@/data/characters'
import type { ProjectStatus } from '@/types/project'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  released: 'RELEASED',
  inDevelopment: 'IN DEVELOPMENT',
  prototype: 'PROTOTYPE',
  comingSoon: 'COMING SOON',
}

function games(host: HTMLElement): void {
  host.innerHTML = PROJECTS.map(
    (p) => `
    <article class="fb-game">
      <div class="fb-game__art"${p.keyArt ? ` style="background-image:url('${p.keyArt}')"` : ' data-empty'}></div>
      <div class="fb-game__body">
        <h2 class="fb-game__name">${p.title}</h2>
        <p class="fb-game__tag">${p.tagline}</p>
        <p class="fb-game__tag fb-game__tag--ko">${p.taglineKo}</p>
        <dl class="fb-facts">
          <div><dt>GENRE</dt><dd>${p.genre}</dd></div>
          <div><dt>STATUS</dt><dd>${STATUS_LABEL[p.status]}</dd></div>
          <div><dt>PLATFORM</dt><dd>${p.platforms.join(' · ')}</dd></div>
        </dl>
        ${
          p.links.length
            ? `<p class="fb-links">${p.links
                .map((l) => `<a href="${l.href}">${l.label} <span aria-hidden="true">↗</span></a>`)
                .join('')}</p>`
            : ''
        }
      </div>
    </article>`,
  ).join('')
}

function studio(host: HTMLElement): void {
  const crew = CHARACTERS.map(
    (c) => `<li><b>${c.name}</b><span>${c.trait}</span></li>`,
  ).join('')
  const making = PROJECTS.map(
    (p) => `<li>${p.title} <span>${p.genre} · ${STATUS_LABEL[p.status]}</span></li>`,
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
  const gamesHost = root.querySelector<HTMLElement>('[data-fallback-games]')
  if (gamesHost) games(gamesHost)
  const studioHost = root.querySelector<HTMLElement>('[data-fallback-studio]')
  if (studioHost) studio(studioHost)
}
