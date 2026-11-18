import { onScopeDispose, watch, type Ref } from "vue";

/** 按卡片真实高度占用网格行，图片加载及视口变化后重新测量；不重排数据或DOM。 */
export function useNoteMasonry(grid: Ref<HTMLElement | null>) {
  const stop = watch(grid, (element, _, onCleanup) => {
    if (!element) return;
    const observed = new Set<HTMLElement>();
    const measure = (card: HTMLElement) => {
      const gap = Number.parseFloat(
        getComputedStyle(element).getPropertyValue("--notes-card-gap"),
      ) || 14;
      card.style.gridRowEnd = `span ${Math.ceil(card.offsetHeight + gap)}`;
    };
    const resize = new ResizeObserver((entries) => {
      for (const entry of entries) measure(entry.target as HTMLElement);
    });
    const sync = () => {
      const cards = new Set(Array.from(element.children) as HTMLElement[]);
      for (const card of observed) {
        if (!cards.has(card)) {
          resize.unobserve(card);
          observed.delete(card);
        }
      }
      for (const card of cards) {
        if (!observed.has(card)) {
          observed.add(card);
          resize.observe(card);
        }
        measure(card);
      }
    };
    const mutations = new MutationObserver(sync);
    mutations.observe(element, { childList: true });
    sync();
    onCleanup(() => {
      resize.disconnect();
      mutations.disconnect();
    });
  }, { flush: "post" });
  onScopeDispose(stop);
}
