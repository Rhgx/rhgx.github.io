/**
 * Centralized Animation Module
 * All GSAP animations for the TF2 Data Visualizer
 */

// Check reduced motion preference once
export const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Animation configuration
const CONFIG = {
  duration: {
    fast: 0.15,
    normal: 0.25,
    slow: 0.35
  },
  ease: {
    in: "power2.in",
    out: "power2.out",
    snap: "power3.out"
  },
  stagger: {
    fast: 0.025,
    normal: 0.04,
    slow: 0.08
  }
};

/**
 * Check if GSAP is available and animations are allowed
 */
function canAnimate() {
  return typeof gsap !== "undefined" && !prefersReducedMotion;
}

/**
 * Fade in an element
 */
export function fadeIn(element, options = {}) {
  if (!canAnimate() || !element) return Promise.resolve();
  
  const { duration = CONFIG.duration.normal, delay = 0, scale = false } = options;
  
  return gsap.fromTo(element,
    { opacity: 0, ...(scale && { scale: 0.95 }) },
    { opacity: 1, scale: 1, duration, delay, ease: CONFIG.ease.out }
  );
}

/**
 * Fade out an element
 */
export function fadeOut(element, options = {}) {
  if (!canAnimate() || !element) {
    options.onComplete?.();
    return Promise.resolve();
  }
  
  const { duration = CONFIG.duration.fast, y = 0, onComplete } = options;
  
  return gsap.to(element, {
    opacity: 0,
    y,
    duration,
    ease: CONFIG.ease.in,
    onComplete
  });
}

/**
 * Stagger reveal multiple elements
 */
export function staggerReveal(elements, options = {}) {
  if (!canAnimate() || !elements?.length) return Promise.resolve();
  
  const { 
    duration = CONFIG.duration.fast + 0.05,
    stagger = CONFIG.stagger.fast,
    y = 8,
    scale = 0.98
  } = options;
  
  gsap.killTweensOf(elements);
  
  return gsap.fromTo(elements,
    { opacity: 0, y, scale },
    { opacity: 1, y: 0, scale: 1, duration, stagger, ease: CONFIG.ease.snap }
  );
}

/**
 * Slide tab indicator to target button
 */
export function slideTabIndicator(indicator, targetBtn, navElement, animate = true) {
  if (!indicator || !targetBtn || !navElement) return;
  
  const btnRect = targetBtn.getBoundingClientRect();
  const navRect = navElement.getBoundingClientRect();
  const left = btnRect.left - navRect.left;
  const width = btnRect.width;
  
  if (animate && canAnimate()) {
    gsap.to(indicator, {
      left,
      width,
      duration: CONFIG.duration.slow,
      ease: CONFIG.ease.out
    });
  } else {
    indicator.style.left = left + "px";
    indicator.style.width = width + "px";
  }
}

/**
 * Animate tab section entrance
 */
export function animateTabIn(section) {
  if (!canAnimate() || !section) return;
  
  gsap.killTweensOf(section);
  
  // Quick fade in for the section
  gsap.fromTo(section,
    { opacity: 0 },
    { opacity: 1, duration: CONFIG.duration.fast, ease: "power1.out" }
  );
  
  // Snappy stagger for children
  const children = section.querySelectorAll(".stat-card, .chart-container, .filter-bar, .section-panel");
  if (children.length) {
    staggerReveal(children);
  }
}

/**
 * Animate tab buttons appearing
 */
export function animateTabButtons(buttons) {
  if (!canAnimate() || !buttons?.length) return;
  
  return gsap.fromTo(buttons,
    { opacity: 0, y: -10 },
    { opacity: 1, y: 0, duration: CONFIG.duration.slow, stagger: CONFIG.stagger.slow, ease: CONFIG.ease.out }
  );
}

/**
 * Set element opacity (for resetting after animations)
 */
export function setOpacity(element, value) {
  if (!canAnimate() || !element) return;
  gsap.set(element, { opacity: value });
}

/**
 * Kill all tweens on an element
 */
export function killTweens(element) {
  if (typeof gsap !== "undefined" && element) {
    gsap.killTweensOf(element);
  }
}
