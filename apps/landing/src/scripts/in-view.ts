/**
 * Shared IntersectionObserver utility for landing page sections.
 *
 * Usage: add `data-in-view-root` to any section element.
 * When the element enters the viewport (threshold 0.1), it will
 * receive the attribute `data-in-view="true"`, which CSS can target
 * for reveal animations.
 *
 * Import this script once from a layout or include it via
 * `<script>` in any component that needs it — Astro deduplicates
 * module scripts automatically.
 */
function initInView() {
  const elements = document.querySelectorAll<HTMLElement>(
    '[data-in-view-root]',
  );

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).setAttribute('data-in-view', 'true');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1 },
  );

  for (const el of elements) {
    observer.observe(el);
  }
}

// Run on initial load
initInView();

// Re-run after Astro view transitions (if used)
document.addEventListener('astro:after-swap', initInView);
