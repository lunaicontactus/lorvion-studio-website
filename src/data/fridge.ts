/**
 * What is in the fridge.
 *
 * The same groceries that are stacked outside the shutter: they were carried
 * in, so this is where they went. Reusing those cut-outs is not a stand-in —
 * it is the same week's shopping, one screen later.
 *
 * Each line is one line. The fridge is not an inventory and does not count
 * anything; it exists so the room reads as a place people actually use.
 */
export interface FridgeItem {
  readonly id: string
  readonly label: string
  /** Said once when the thing is touched. Short, or it is not worth saying. */
  readonly note: string
  readonly art: string | null
}

const P = '/assets/images/alley'
const G = '/assets/images/garage'

export const FRIDGE_ITEMS: readonly FridgeItem[] = [
  { id: 'eggs', label: '계란', note: '서른 개였는데.', art: `${P}/alley_prop_eggs.webp` },
  { id: 'cup-ramen', label: '컵라면', note: '또 이거야?', art: `${P}/alley_prop_cup_ramen.webp` },
  // Not from the pile outside: what somebody was in the middle of.
  { id: 'ramen-open', label: '먹던 컵라면', note: '누가 먹다 말았어. 아직 따뜻해.', art: `${G}/prop_cup_ramen_open.webp` },
  { id: 'water', label: '생수', note: '누가 또 한 박스 시켰다.', art: `${P}/alley_prop_water_pack.webp` },
  { id: 'cola', label: '제로콜라', note: '먹지 말라고 붙여놨다.', art: `${P}/alley_prop_zero_cola.webp` },
  { id: 'drink', label: '음료', note: '얼음은 진작 녹았다.', art: `${G}/prop_drink_cup.webp` },
  { id: 'gap', label: '빈 칸', note: '여기 뭐 있었는데.', art: null },
]
