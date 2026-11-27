/**
 * Smoothly scrolls to a target section ID after React finishes rendering,
 * accounting for the sticky header height so the section starts cleanly at the top
 * of the visible viewport instead of jumping behind the navbar or to the bottom.
 */
export function scrollToSection(sectionId: string, extraOffsetPx = 16): void {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(sectionId);
      if (!target) return;

      const header = document.querySelector('header');
      const headerHeight = header ? header.getBoundingClientRect().height : 64;
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      const destination = Math.max(0, Math.round(targetTop - headerHeight - extraOffsetPx));

      window.scrollTo({
        top: destination,
        behavior: 'smooth',
      });
    });
  });
}
