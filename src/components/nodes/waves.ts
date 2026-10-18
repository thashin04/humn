/** Bar heights for a take's two versions, from the Figma take card. B is A backwards. */
export const TAKE_A = [32, 15, 40, 28, 59, 23, 21, 49, 49, 30, 30, 34, 19, 61, 35, 25, 36, 53, 24, 42, 24, 18, 58, 47, 25, 22, 51, 16, 51, 18]
export const TAKE_B = [...TAKE_A].reverse()

/** The take cards' own, shorter waveforms, one for each idea. */
export const TAKE_BARS = {
  A: [14, 7, 18, 12, 26, 10, 9, 22, 22, 13, 13, 15, 8, 27, 16, 11, 16, 24, 11, 19, 11, 8, 26, 21, 11, 10, 23, 7, 15, 20],
  B: [9, 20, 11, 24, 8, 15, 26, 12, 10, 18, 22, 9, 14, 25, 11, 8, 19, 13, 23, 10, 16, 27, 12, 9, 21, 14, 10, 17, 22, 12],
}
