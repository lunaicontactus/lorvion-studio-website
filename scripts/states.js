/**
 * The states the room actually asks for, made by moving as little as possible.
 *
 * These models have no skeleton, so every pose is vertices moved by hand and
 * every degree of rotation is a risk to a face that is already right. The
 * rule here is that the head never deforms, the body never stretches, and the
 * limbs turn about real joints by small angles. A small dokkaebi trotting is
 * the target, not a walk cycle.
 */
export const REGIONS = {
  // Fractions of the standing height, read off the models: the legs stop
  // where the briefs start, the neck is the narrow band under the hair.
  legTop: 0.30,
  hipY: 0.33,
  shoulderY: 0.47,
  neckY: 0.55,
}

/** Smooth 0..1 so a joint bends instead of creasing. */
export const ease = (t) => {
  t = Math.max(0, Math.min(1, t))
  return t * t * (3 - 2 * t)
}

/**
 * What each action does on each frame, as small transforms.
 *
 * Everything is a function of the frame index so the loops read as loops:
 * walk is a four-beat contact/pass/contact/pass, and the rest are gentle
 * there-and-back shapes that survive being played straight or ping-ponged.
 */
export function poseFor(action, i, n) {
  const t = i / n                       // 0..1 round the loop
  const tau = Math.PI * 2 * t
  switch (action) {
    case 'walk':
      return {
        // One leg forward while the other is back, swapping each half cycle.
        legSwing: Math.sin(tau) * 13,
        // The body rides up on the pass frames and down on the contacts.
        bob: -Math.abs(Math.cos(tau)) * 0.012 + 0.006,
        // A small roll, so the walk reads from the front as well as the side.
        roll: Math.sin(tau) * 1.6,
        // Arms answer the legs.
        armSwing: -Math.sin(tau) * 9,
        headBob: Math.abs(Math.cos(tau)) * 0.004,
        lean: 2,
      }
    case 'work':
      return { lean: 7, armSwing: Math.sin(tau) * 6, armLift: 14,
        headBob: Math.sin(tau) * 0.005, bob: 0, legSwing: 0, roll: 0 }
    case 'wave':
      // One arm only. The rest of the character holds still.
      return { waveArm: 1, waveLift: 78, waveOut: Math.sin(tau) * 13,
        lean: 0, bob: 0, legSwing: 0, roll: 0, armSwing: 0,
        headBob: Math.sin(tau) * 0.003 }
    case 'look':
      // Head and shoulders only, a glance and back.
      return { headTurn: Math.sin(tau) * 17, lean: 1,
        headBob: 0, bob: 0, legSwing: 0, roll: 0, armSwing: 0 }
    case 'sit':
      // Folding the legs up to a real sitting angle turned the thighs into a
      // flat slab with the briefs smeared along it — the melted look the
      // brief forbids. So the legs barely bend and the figure sinks instead:
      // the shins go below the floor row the frame is cropped at, and what is
      // left is a low, settled shape. No skeleton needed, nothing stretched.
      return { sit: 1, sitBend: 26, sitDrop: 0.115, breath: Math.sin(tau) * 0.004,
        lean: 5, headBob: 0, bob: 0, legSwing: 0, roll: 0, armSwing: 3 }
    default:
      return {}
  }
}
