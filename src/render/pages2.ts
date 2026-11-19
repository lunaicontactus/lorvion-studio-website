/**
 * The EUNGARAGE 2.0 pages' renderers: CREW, DIARY, ARCADE, RADIO.
 *
 * Kept apart from src/render/pages.ts so their text and data are loaded only
 * on their own pages (src/app/boot.ts imports each page's script on demand),
 * not by every page of the site. The build prerenders them the same way
 * (vite.config.ts).
 */
import { esc } from '@/render/pages'
import { CHARACTERS } from '@/data/characters'
import { PROJECTS } from '@/data/projects'
import { CREW_PROFILES } from '@/data/crewProfiles'
import { DIARY, DIARY_KINDS } from '@/data/diary'
import { ARCADE, playHref } from '@/data/arcade'
import { PUBLIC_ARCHIVE } from '@/data/publicArchive'

/**
 * CREW (EUNGARAGE 2.0, PART 18): a badge per character that turns over — the
 * front is who they are, the back how they work — then each one's own section:
 * the big picture, the profile, the walk, the lines, and the character sheet.
 * The badge turns with a real button (aria-pressed), so keyboard and screen
 * readers get both sides; without scripts both sides simply show.
 */
export function crewHtml(): string {
  const frames = (id: string): string => Array.from({ length: 8 }, (_, i) =>
    `/assets/images/crew-mochi/${id}/walk/front/${id}_walk_front_${String(i + 1).padStart(2, '0')}.webp`).join(' ')
  const badges = CHARACTERS.map((c) => {
    const p = CREW_PROFILES.find((q) => q.id === c.id)
    if (!p) return ''
    return `
      <li class="badge" id="badge-${c.id}" style="--accent:${c.accent};--body:${p.colourHex}">
        <div class="badge__card" data-badge>
          <section class="badge__side badge__front" aria-label="${esc(c.nameKo)} 사원증 앞면">
            <p class="badge__studio">EUNGARAGE · STAFF</p>
            <img class="badge__pic" src="/assets/images/crew-mochi/${c.id}/${c.id}_portrait.webp" alt="${esc(c.nameKo)}" width="200" height="200" loading="lazy" decoding="async">
            <h2 class="badge__name">${esc(c.nameKo)} <span lang="en">${esc(c.name)}</span></h2>
            <p class="badge__staff">${esc(c.staff ?? '')}</p>
            <p class="badge__role">${esc(c.roleKo ?? '')}</p>
            <p class="badge__colour"><span class="badge__swatch" aria-hidden="true"></span>${esc(c.colour ?? '')}</p>
            <p class="badge__line">“${esc(c.line ?? '')}”</p>
          </section>
          <section class="badge__side badge__back" aria-label="${esc(c.nameKo)} 사원증 뒷면">
            <dl>
              <dt>성격</dt><dd>${esc(p.personality)}</dd>
              <dt>좋아하는 것</dt><dd>${p.likes.map(esc).join(' · ')}</dd>
              <dt>작업 습관</dt><dd>${p.habits.map(esc).join(' · ')}</dd>
              <dt>대표 소품</dt><dd>${esc(c.prop ?? '')}</dd>
              <dt>자주 있는 곳</dt><dd>${esc(p.spot)}</dd>
            </dl>
            <p class="badge__more"><a href="#${c.id}">${esc(c.nameKo)} 자세히 <span aria-hidden="true">↓</span></a></p>
          </section>
        </div>
        <button type="button" class="badge__flip" data-badge-flip aria-pressed="false" aria-controls="badge-${c.id}">사원증 뒤집기</button>
      </li>`
  }).join('')
  const details = CHARACTERS.map((c) => {
    const p = CREW_PROFILES.find((q) => q.id === c.id)
    if (!p) return ''
    return `
    <section class="crew-detail" id="${c.id}" aria-labelledby="crew-${c.id}-h" style="--accent:${c.accent}">
      <div class="crew-detail__head">
        <img class="crew-detail__pic" src="/assets/images/crew-mochi/${c.id}/${c.id}_portrait.webp" alt="${esc(c.nameKo)}, ${esc(c.prop ?? '')}을 든 모습" width="320" height="320" loading="lazy" decoding="async">
        <div>
          <p class="eyebrow">${esc(c.staff ?? '')} · ${esc(c.roleKo ?? '')}</p>
          <h2 id="crew-${c.id}-h">${esc(c.nameKo)} <span lang="en">${esc(c.name)}</span></h2>
          <p>${esc(p.personality)}</p>
          <p class="crew-detail__walk"><img src="/assets/images/crew-mochi/${c.id}/walk/front/${c.id}_walk_front_01.webp" data-crew-walk="${frames(c.id)}" alt="${esc(c.nameKo)}가 걷는 모습" width="117" height="105" loading="lazy" decoding="async"><span>차고에서 걷는 모습</span></p>
        </div>
      </div>
      <h3>자주 하는 말</h3>
      <ul class="crew-detail__lines">${p.lines.map((l) => `<li>“${esc(l)}”</li>`).join('')}</ul>
      <h3>관련 콘텐츠</h3>
      <p class="link-list">${p.related.map((r) => `<a href="${r.href}">${esc(r.label)} <span aria-hidden="true">→</span></a>`).join(' ')}</p>
      <h3>캐릭터 시트</h3>
      <p class="crew-detail__note">표정 · 동작 · 색상 팔레트가 담긴 원본 디자인 시트입니다.${c.id === 'reven' ? ' 임레븐은 아직 단독 시트가 없어 크루 종합 시트의 일부를 실었습니다.' : ''}</p>
      <a class="crew-detail__sheet" href="${p.sheet.src}"><img src="${p.sheet.src}" alt="${esc(c.nameKo)} 캐릭터 시트: 앞 · 옆 · 뒤, 표정, 동작, 색상" width="${p.sheet.w}" height="${p.sheet.h}" loading="lazy" decoding="async"></a>
    </section>`
  }).join('')
  return `
    <ul class="badges">${badges}
    </ul>
    <div class="crew-details">${details}
    </div>`
}

/**
 * DIARY (EUNGARAGE 2.0, PART 11): a minihompy diary — date, title, tag, kind,
 * the note itself, a picture, where it stands. Each note is a <details>, so
 * it opens without a script and reads as plain text; the script only adds
 * the page-turn and the kind filter.
 */
export function diaryHtml(): string {
  const tagLabel = (t: string): string => (t === 'EUNGARAGE' ? 'EUNGARAGE' : PROJECTS.find((p) => p.id === t)?.title ?? t)
  const who = (id: string): string => CHARACTERS.find((c) => c.id === id)?.nameKo ?? ''
  const filters = ['전체', ...DIARY_KINDS.filter((k) => DIARY.some((e) => e.kind === k))]
    .map((k, i) => `<button type="button" class="diary-filter" data-diary-filter="${i === 0 ? '' : esc(k)}" aria-pressed="${i === 0}">${esc(k)}</button>`).join('')
  const entries = DIARY.map((e, i) => `
      <li class="diary-entry" id="${e.id}" data-kind="${esc(e.kind)}">
        <details class="diary-note"${i === 0 ? ' open' : ''}>
          <summary>
            <time datetime="${e.date}">${e.date.replace(/-/g, '.')}</time>
            <span class="diary-note__title">${esc(e.title)}</span>
            <span class="diary-note__tags"><span class="diary-tag">${esc(tagLabel(e.tag))}</span><span class="diary-kind">${esc(e.kind)}</span><span class="diary-status" data-status="${e.status === '완료' ? 'done' : 'doing'}">${esc(e.status)}</span></span>
          </summary>
          <div class="diary-note__page">
            ${e.body.map((b) => `<p>${esc(b)}</p>`).join('')}
            ${e.image ? `<img src="${e.image.src}" alt="${esc(e.image.alt)}" width="${e.image.w}" height="${e.image.h}" loading="lazy" decoding="async">` : ''}
            ${e.link ? `<p class="link-list"><a href="${e.link.href}">${esc(e.link.label)} <span aria-hidden="true">→</span></a></p>` : ''}
            <p class="diary-note__by">— ${esc(who(e.by))}</p>
          </div>
        </details>
      </li>`).join('')
  return `
    <div class="diary-filters" role="group" aria-label="일지 종류">${filters}</div>
    <ol class="diary-list" reversed>${entries}
    </ol>`
}

/**
 * ARCADE (EUNGARAGE 2.0, PART 14): every mini-game, each a cabinet card —
 * who it stars, how long a round is, the hint, and a PLAY button that goes
 * straight in. The best score is this browser's own (filled in by the page
 * script from local storage; there is no online ranking).
 */
export function arcadeHtml(): string {
  const cards = ARCADE.map((g) => {
    const c = CHARACTERS.find((x) => x.id === g.who)
    return `
      <li class="cabinet" data-arcade-game="${g.id}" style="--accent:${c?.accent ?? '#ff91c8'}">
        <div class="cabinet__screen">
          <img src="/assets/images/crew-mochi/${g.who}/${g.who}_portrait.webp" alt="" width="120" height="120" loading="lazy" decoding="async">
          <span class="cabinet__badge">${g.where === 'arcade' ? 'NEW · 아케이드' : '놀이터'}</span>
        </div>
        <h2 class="cabinet__title">${esc(g.title)}</h2>
        <p class="cabinet__hint">${esc(g.hint)}</p>
        <p class="cabinet__meta">${g.seconds}초 · ${esc(c?.nameKo ?? '')}${g.secret ? ' · <span title="별을 모으면 비밀문이 열려요">★ 비밀문 별</span>' : ''}</p>
        <p class="cabinet__best" data-arcade-best>최고 점수 <b>—</b></p>
        <a class="cabinet__play" href="${playHref(g.id)}">PLAY <span aria-hidden="true">▶</span></a>
      </li>`
  }).join('')
  return `
    <ul class="cabinets">${cards}
    </ul>
    <p class="arcade-note">점수는 이 브라우저에만 저장돼요. 온라인 랭킹은 아직 없어요.</p>`
}

/**
 * RADIO (EUNGARAGE 2.0, PART 17): a pink cassette player with the studio's
 * own songs — the SOUND shelf of the public archive, the files the garage
 * and the playground really play. Nothing plays until the visitor presses
 * play. The list is prerendered, so it reads without a script.
 */
export function radioHtml(): string {
  const tracks = PUBLIC_ARCHIVE.filter((e): e is Extract<typeof e, { kind: 'track' }> => e.kind === 'track')
  const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
  return `
    <div class="cassette" data-cassette>
      <img class="cassette__dj" src="/assets/images/crew-mochi/yomi/yomi_portrait.webp" alt="요미, 카세트 플레이어를 든 모습" width="140" height="140" loading="lazy" decoding="async">
      <div class="cassette__body">
        <p class="cassette__label">EUNGARAGE RADIO <span>· DJ 요미</span></p>
        <p class="cassette__now" data-radio-now aria-live="polite">재생 버튼을 눌러 주세요</p>
        <div class="cassette__reels" aria-hidden="true"><i></i><i></i></div>
        <div class="cassette__bar"><input type="range" min="0" max="1000" value="0" step="1" data-radio-seek aria-label="재생 위치"><span data-radio-time>0:00 / 0:00</span></div>
        <div class="cassette__keys">
          <button type="button" data-radio="prev" aria-label="이전 곡">⏮</button>
          <button type="button" data-radio="play" aria-label="재생" aria-pressed="false">▶</button>
          <button type="button" data-radio="next" aria-label="다음 곡">⏭</button>
          <button type="button" data-radio="mute" aria-label="음소거" aria-pressed="false">🔈</button>
          <label class="cassette__vol"><span class="visually-hidden">볼륨</span><input type="range" min="0" max="100" value="60" data-radio-vol aria-label="볼륨"></label>
        </div>
      </div>
    </div>
    <ol class="playlist" data-playlist>${tracks.map((t, i) => `
      <li><button type="button" data-track="${i}" data-src="${t.src}"><b>${esc(t.title)}</b><span>${esc(t.note)}</span><time>${mmss(t.length)}</time></button></li>`).join('')}
    </ol>
    <p class="radio-note">임레븐의 목소리 코너는 아직 녹음이 없어 비어 있어요. 녹음이 생기면 여기에 열어 둘게요.</p>`
}
