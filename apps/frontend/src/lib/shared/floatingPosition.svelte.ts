export function createFloatingPosition() {
  let top = $state(0);
  let left = $state(0);

  function placeBelow(el: HTMLElement, gap = 4) {
    const rect = el.getBoundingClientRect();
    top = rect.bottom + gap;
    left = rect.left;
  }

  function placeAtLine(el: HTMLElement, lineTop: number, leftOffset = 0) {
    const rect = el.getBoundingClientRect();
    top = rect.top + lineTop;
    left = rect.left + leftOffset;
  }

  return {
    get top() {
      return top;
    },
    get left() {
      return left;
    },
    placeBelow,
    placeAtLine,
  };
}
