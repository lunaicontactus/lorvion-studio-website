/**
 * What every audio file in the repository is (SITE UPGRADE PHASE F audit).
 *
 * Decided from the file and from where the site plays it, not from its name
 * (docs/SITE_UPGRADE_PHASE_F.md has the measurements). Two measures did most
 * of the work: how pitched the long-term spectrum is ("tonal", 0–1) and how
 * much of the energy is above 2 kHz ("hf"). The real ambiences are noise —
 * the alley's air, the night insects outside — with most of their energy up
 * high; every song sits low and is strongly pitched. The file called
 * `ambient.m4a` measures as a song (tonal 0.96, hf 0.03, a 134 BPM pulse),
 * and the site already plays it only as the radio's NIGHT station.
 *
 * Nothing here plays anything; src/systems/audio.ts does. This is the
 * record the tests hold the players to.
 */
export type AudioRole = 'AMBIENT' | 'MUSIC' | 'SFX' | 'UI' | 'UNUSED' | 'UNKNOWN'

export interface AudioFile {
  readonly role: AudioRole
  /** Where it plays, or why it does not. */
  readonly use: string
}

const A = '/assets/audio'

export const AUDIO_ROLES: Readonly<Record<string, AudioFile>> = {
  // ── AMBIENT: the air of a place. Noise, not tune (hf 0.93–0.96). ──
  [`${A}/ambience/alley.m4a`]: { role: 'AMBIENT', use: 'the alley, from ENTER until the shutter is up' },
  [`${A}/ambience/playground_night.m4a`]: { role: 'AMBIENT', use: 'outside, under the playground song (night insects)' },
  // ── MUSIC: one at a time. ──
  [`${A}/music/garage.m4a`]: { role: 'MUSIC', use: "the garage's own song; radio GARAGE 88.1" },
  [`${A}/ambient.m4a`]: { role: 'MUSIC', use: 'radio NIGHT 91.7 — a song despite its name (tonal 0.96, hf 0.03)' },
  [`${A}/sfx/radio_static_bed.m4a`]: { role: 'MUSIC', use: 'radio DOKKA NEWS 96.4 and STATIC 103.2: what the radio plays, so it takes the music slot' },
  [`${A}/music/playground.m4a`]: { role: 'MUSIC', use: 'outside' },
  [`${A}/music/archive.m4a`]: { role: 'MUSIC', use: 'the secret storage' },
  [`${A}/music/music_box.m4a`]: { role: 'MUSIC', use: "the archive's music box; takes the slot from the archive song while it plays" },
  [`${A}/music/poko.m4a`]: { role: 'MUSIC', use: 'game: mugunghwa' },
  [`${A}/music/snack.m4a`]: { role: 'MUSIC', use: 'game: snack' },
  [`${A}/music/parcel.m4a`]: { role: 'MUSIC', use: 'game: parcel' },
  // ── UI: the machines answering a touch. Small. ──
  [`${A}/sfx/pc_on.m4a`]: { role: 'UI', use: 'the PC opens' },
  [`${A}/sfx/pc_click.m4a`]: { role: 'UI', use: 'PC desktop icons, back/open; the monitor beep' },
  [`${A}/sfx/tv_channel.m4a`]: { role: 'UI', use: 'the TV opens, a channel changes' },
  [`${A}/sfx/radio_tune.m4a`]: { role: 'UI', use: "the radio's knob, off → on, once" },
  // ── SFX: things in the room and in the games. ──
  [`${A}/sfx/fridge_open.m4a`]: { role: 'SFX', use: 'the fridge opens' },
  [`${A}/sfx/drawer_open.m4a`]: { role: 'SFX', use: 'the records cabinet opens' },
  [`${A}/sfx/door_open.m4a`]: { role: 'SFX', use: 'the outside door, the secret door, the parcel game door' },
  [`${A}/sfx/paper.m4a`]: { role: 'SFX', use: 'workbench, wall pictures, records, archive papers' },
  [`${A}/sfx/shutter_open.m4a`]: { role: 'SFX', use: 'the shutter rising at ENTER, and leaving' },
  [`${A}/sfx/broom.m4a`]: { role: 'SFX', use: 'the broom sweeping' },
  [`${A}/sfx/crew_step_01.m4a`]: { role: 'SFX', use: "the crew's footsteps (one gate for all of them)" },
  [`${A}/sfx/star_get.m4a`]: { role: 'SFX', use: 'a star found; a game won' },
  [`${A}/sfx/secret_unlock.m4a`]: { role: 'SFX', use: 'the secret door unlocking' },
  [`${A}/sfx/lantern.m4a`]: { role: 'SFX', use: 'archive lanterns' },
  [`${A}/sfx/game_start.m4a`]: { role: 'SFX', use: 'a game starts' },
  [`${A}/sfx/game_fail.m4a`]: { role: 'SFX', use: 'a game lost' },
  [`${A}/sfx/stall_bell.m4a`]: { role: 'SFX', use: 'game: snack, the stall bell' },
  [`${A}/sfx/momo_jump.m4a`]: { role: 'SFX', use: 'game: parcel, MOMO jumps' },
  [`${A}/sfx/momo_run_1.m4a`]: { role: 'SFX', use: 'game: parcel, MOMO running (1 of 3)' },
  [`${A}/sfx/momo_run_2.m4a`]: { role: 'SFX', use: 'game: parcel, MOMO running (2 of 3)' },
  [`${A}/sfx/momo_run_3.m4a`]: { role: 'SFX', use: 'game: parcel, MOMO running (3 of 3)' },
  [`${A}/sfx/eat.m4a`]: { role: 'SFX', use: 'game: sneak, a bite' },
  [`${A}/sfx/eat_soft.m4a`]: { role: 'SFX', use: 'game: sneak, a small bite' },
  [`${A}/sfx/poko_turn.m4a`]: { role: 'SFX', use: 'game: sneak, POKO turns round (the cue)' },
  [`${A}/sfx/poko_step.m4a`]: { role: 'SFX', use: 'game: sneak, POKO steps' },
  // ── UNUSED: kept, not played. ──
  [`${A}/sfx/radio_static.m4a`]: { role: 'UNUSED', use: 'source of radio_static_bed (scripts/static_bed.py); same recording as radio_tune (correlation 0.995). ARCHIVE' },
}
