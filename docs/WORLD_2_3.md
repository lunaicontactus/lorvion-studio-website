# EUNGARAGE WORLD 2.3 — interaction and audio polish

Branch `world-2.3`, from `f0ce189` (live). What the studio found by playing
the site, and what was done about each, in the order the brief set.

## 1. The secret door's lock, on the door

The door in the bookcase needs a star from each of the three games. Nothing
said so: the door showed "★ 0/3" in a hover caption and the playground gave
no clue where a star came from, so the studio went looking for stars on the
map.

Now the rule is in the objects. The door wears a small carved plank with
three star sockets (`.thing__stars`, sized on screen like the labels so a
phone's small cabinet reads it too): dark hollows for stars not yet earned, a
lit felt star for each that is. Each game building in the playground wears
one socket on its sign (`.spot__socket`), dark until that game has given its
star. No caption, no popup.

Feedback, once per star: leaving a game that has just given its first star,
the building's socket lights with a small chime as the building comes back
into view; coming back into the garage, the camera glances at the door, the
new socket lights with the same chime, and the camera returns (about 1.5 s).
The third star lights, a breath, then the handle gives, the seam comes
alight and the door is open — once; a reload finds it open, three stars lit,
and nothing repeats. `secretProgress` in the save is what the room has
already shown, as before.

## 2. The radio's power sound, repeating

Cause: `radio_static.m4a` is the studio's two-second static clip, and it was
the NEWS and STATIC stations' *track*, looped. A two-second burst restarting
every two seconds is a switch being thrown again and again. Not a timer, not
a re-render: the station itself.

Fix: `scripts/static_bed.py` tiles that same clip (forwards and reversed,
equal-power crossfades, tail blended into head) into a 21.7-second seamless
bed, `radio_static_bed.m4a`; the two stations play that. Nothing new was made.

And the power sound is now one event: `radio_tune` plays in the audio
manager when the sound preference goes from off to on inside the room (the
nav switch and the radio's knob are one switch), and nowhere else — not on
opening the radio, not on changing station, not on entering the room, not
when the tab comes back. Removed: the `radio_tune` on every touch of the
radio (`REACT_SFX`) and on every station change.

## 3. Music is one thing at a time

The world's music (playground, archive, a game) and the radio's station share
a rule in `AudioManager`: whichever is sounding goes down and out over 420 ms
before the other starts (`handoff`); a station change takes the old station
down for 180 ms and the new one up. A start asked for during a handoff cancels
the earlier one (`after`), so nothing stale starts. Room tone and the loops
under the music are not music and are untouched. `musicSounding` reports what
is on, for tests. `e2e/audio.spec.ts` samples the whole crossing out and back
every 250 ms: never two.

## 4. The dokkaebi fires

Two-thirds the size (84 → 54 units at scale 1), opacity .58, one slow drift
(10 s, 3 × 6 px) and no breathing scale; the middle one on the landscape plate
moved from the parcel office's steps to the bushes beside them. Three at
most, `pointer-events: none`, never over a place (asserted).

## 5–10. Things react as themselves

The white silhouette stroke, its dark under-stroke and the backdrop "lift"
are gone from every thing in the garage and every place outside, including
keyboard focus. In their place: `.thing__self` / `.spot__self` — the painting
again, positioned pixel for pixel on the object, clipped to its silhouette
(garage) or soft-edged (outside), invisible at rest. Under the pointer it
comes forward by a few world units (`--lift`, the same distance for a fridge
as for a radio), brightens a touch and throws a shadow; pressed, it gives
(scale .982, 70 ms); open, it stays a little forward. Placed things (the
radio, the parcel) do the same with their own picture; the frames on the
wall keep their lift. Keyboard focus is the same lift with a warm glow, and
the button's own outline is `none` — no rectangle from anywhere. Touch has no
hover: the thing gives while the finger is down.

Doors: pressed, the door gives inward; released, `door-give` brings it
forward and warms it while its cut-out's leaf swings and the light comes
through; then the crossing. The hit areas are unchanged and still grow to a
fingertip; only the reaction is the object's own.

## 11. The playground's hit areas, measured

`e2e/interaction.spec.ts` aims at the painted middle of each place (plate
coordinates read off the plates, `AIM`) at 1440×900, 390×844 and 844×390,
converts through the rendered world transform, and asserts
`elementFromPoint` lands on that place and the hit area's middle is within a
quarter of its size of the aim. All five places, all three sizes.

## 12–14. Tests

`e2e/interaction.spec.ts` (every thing and place: reacts, gives, no box, at
three sizes; the door's press-and-open; the fires), `e2e/audio.spec.ts` (the
power sound once; the static bed; music one at a time out and back; a hidden
tab), the star-by-star journey in `e2e/archive.spec.ts` (0/3, 1/3 with the
glance and chime, 2/3, 3/3 opening once, reload, the buildings' sockets).
`outline.spec.ts` (every engine) now checks the lift, not a stroke.
