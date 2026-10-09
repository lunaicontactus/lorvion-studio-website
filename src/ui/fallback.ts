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

const esc = (t: string): string =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** The approved crew's own face (the same frame src/ui/panels.ts ownerPortrait uses). */
const face = (id: string): string => `/assets/images/dokkaebi-v2/${id}/idle/front/${id}_idle_front_01.webp`

/**
 * STUDIO (SITE UPGRADE PHASE H, docs/SITE_IA.md §8): who, how the work gets
 * made, the crew, what is being made now, and how to reach the people. Short,
 * and nothing that is not true — no team size, no founding year, no dates.
 */
function studio(host: HTMLElement): void {
  const making = PROJECTS.map((p) => `
      <li class="studio-work"><a href="${workHref(p.id)}">
        <b class="studio-work__t">${esc(p.title)}</b>
        <span class="studio-work__g">${esc(p.genre)}</span>
        <span class="studio-work__s"><span class="record__status" data-state="${p.releaseState}">${STATE_LABEL[p.releaseState]}</span> ${esc(p.platforms.join(' · '))}</span>
      </a></li>`).join('')
  const crew = CHARACTERS.map((c) => `
      <li class="studio-crew__one">
        <img src="${face(c.id)}" alt="" width="60" height="84" loading="lazy" decoding="async">
        <span><b>${esc(c.name)}</b> ${esc(c.traitKo)}</span>
      </li>`).join('')
  const mail = contactRows().find((r) => r.key === 'email')
  host.innerHTML = `
    <section aria-labelledby="studio-how">
      <h2 id="studio-how">차고에서 하는 일</h2>
      <p>작은 곳에서 직접 만들고, 고치고, 실험합니다. 감정과 캐릭터, 그리고 그들이 사는 세계를 중심으로 만듭니다.</p>
      <p>만들면서 남은 그림과 시험 화면은 날짜와 함께 <a href="/archive.html">기록실</a>에 남겨 둡니다.</p>
    </section>
    <section aria-labelledby="studio-crew">
      <h2 id="studio-crew">도깨비 크루</h2>
      <p>밤마다 차고에서 일하는 다섯.</p>
      <ul class="studio-crew">${crew}
      </ul>
    </section>
    <section aria-labelledby="studio-making">
      <h2 id="studio-making">지금 만드는 것</h2>
      <ul class="studio-works">${making}
      </ul>
      <p class="link-list"><a href="/works.html">WORKS 전체 보기 <span aria-hidden="true">→</span></a></p>
    </section>
    <section aria-labelledby="studio-contact" id="contact">
      <h2 id="studio-contact">연락</h2>
      <p>${esc(SITE_CONFIG.companyName)} · ${esc(SITE_CONFIG.location)}</p>
      ${mail ? `<p class="link-list"><a href="${mail.href}">${esc(mail.value)}</a></p>` : ''}
      <p><a class="info-button" href="/contact.html">문의하기 <span aria-hidden="true">→</span></a>
         <a class="info-button info-button--quiet" href="/press.html">PRESS KIT</a></p>
    </section>`
}

export function mountFallback(root: ParentNode = document): void {
  const studioHost = root.querySelector<HTMLElement>('[data-fallback-studio]')
  if (studioHost) studio(studioHost)
}
