import { ref } from "vue";

/** 触屏保留原生惯性滚动；鼠标跟手拖动，按距离或速度吸附到相邻图片。 */
export function useNoteGallery(count: () => number) {
  const track = ref<HTMLElement | null>(null);
  const active = ref(0);
  let drag: { x: number; left: number; time: number; index: number } | null =
    null;

  function go(index: number) {
    const element = track.value;
    if (!element) return;
    element.scrollTo({
      left: Math.max(0, Math.min(count() - 1, index)) * element.clientWidth,
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  function scrolled() {
    if (track.value?.clientWidth)
      active.value = Math.round(
        track.value.scrollLeft / track.value.clientWidth,
      );
  }
  function pointerDown(event: PointerEvent) {
    if (event.pointerType !== "mouse" || event.button !== 0 || count() < 2)
      return;
    const element = event.currentTarget as HTMLElement;
    drag = {
      x: event.clientX,
      left: element.scrollLeft,
      time: performance.now(),
      index: active.value,
    };
    element.setAttribute("data-dragging", "true");
    element.setPointerCapture(event.pointerId);
    element.focus({ preventScroll: true });
    event.preventDefault();
  }
  function pointerMove(event: PointerEvent) {
    if (drag && track.value)
      track.value.scrollLeft = drag.left + drag.x - event.clientX;
  }
  function finish(event: PointerEvent, cancelled = false) {
    const start = drag;
    const element = track.value;
    if (!start || !element) return;
    drag = null;
    const distance = start.x - event.clientX;
    const elapsed = Math.max(1, performance.now() - start.time);
    const advance =
      !cancelled &&
      (Math.abs(distance) > element.clientWidth * 0.18 ||
        (Math.abs(distance) > 24 && Math.abs(distance) / elapsed > 0.45));
    const left = element.scrollLeft;
    element.removeAttribute("data-dragging");
    element.scrollLeft = left;
    go(start.index + (advance ? Math.sign(distance) : 0));
    if (element.hasPointerCapture(event.pointerId))
      element.releasePointerCapture(event.pointerId);
  }
  function reset() {
    drag = null;
    active.value = 0;
    if (track.value) {
      track.value.removeAttribute("data-dragging");
      track.value.scrollLeft = 0;
    }
  }
  return {
    track,
    active,
    go,
    scrolled,
    pointerDown,
    pointerMove,
    finish,
    reset,
  };
}
