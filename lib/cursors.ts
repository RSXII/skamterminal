// Early-90s pixel cursors, defined once as ASCII bitmaps.
// X = black outline, o = white fill, anything else = transparent.

export const ARROW = [
  "X...........",
  "XX..........",
  "XoX.........",
  "XooX........",
  "XoooX.......",
  "XooooX......",
  "XoooooX.....",
  "XooooooX....",
  "XoooooooX...",
  "XooooooooX..",
  "XoooooooooX.",
  "XooooooXXXXX",
  "XoooXooX....",
  "XooXXooX....",
  "XoX..XooX...",
  "XX...XooX...",
  "X.....XooX..",
  "......XooX..",
  ".......XX...",
];

// Hotspot is the fingertip at x=4, y=0.
export const HAND = [
  "....XX...........",
  "...XooX..........",
  "...XooX..........",
  "...XooX..........",
  "...XooX..........",
  "...XooXXX........",
  "...XooXooXXX.....",
  "...XooXooXooXX...",
  ".XXXooXooXooXoX..",
  "XooXooooooooooX..",
  "XooXooooooooooX..",
  ".XooooooooooooX..",
  "..XoooooooooooX..",
  "..XoooooooooooX..",
  "...XooooooooooX..",
  "...XooooooooooX..",
  "....XooooooooX...",
  "....XooooooooX...",
  ".....XXXXXXXXX...",
];

export const CURSOR_SCALE = 2;
export const HAND_HOTSPOT = { x: 4, y: 0 };

function rects(bitmap: string[], fill: string, outline: string) {
  let out = "";
  bitmap.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === "X") out += `<rect x='${x}' y='${y}' width='1' height='1' fill='${outline}'/>`;
      else if (c === "o") out += `<rect x='${x}' y='${y}' width='1' height='1' fill='${fill}'/>`;
    }
  });
  return out;
}

export function cursorSvg(bitmap: string[], fill = "#ffffff", outline = "#000000") {
  const w = bitmap[0].length;
  const h = bitmap.length;
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w * CURSOR_SCALE}' height='${h * CURSOR_SCALE}' ` +
    `viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${rects(bitmap, fill, outline)}</svg>`
  );
}

export function cursorUrl(bitmap: string[]) {
  return `url("data:image/svg+xml,${encodeURIComponent(cursorSvg(bitmap))}")`;
}
