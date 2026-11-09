// Share one observer per wall viewport, rather than one per image or loop copy.
const observers = new WeakMap();
export function observeWallMedia(element, ready) {
    if (!('IntersectionObserver' in window)) { ready(); return () => {}; }
    const root = element.closest('[data-wall-viewport]');
    const key = root || document;
    let entry = observers.get(key);
    if (!entry) {
        const callbacks = new Map();
        const observer = new IntersectionObserver(entries => {
            for (const item of entries) if (item.isIntersecting) {
                const callback = callbacks.get(item.target);
                if (callback) { callbacks.delete(item.target); observer.unobserve(item.target); callback(); }
            }
        }, { root, rootMargin: '600px 0px' });
        entry = { observer, callbacks }; observers.set(key, entry);
    }
    entry.callbacks.set(element, ready); entry.observer.observe(element);
    return () => {
        entry.callbacks.delete(element); entry.observer.unobserve(element);
        if (!entry.callbacks.size) { entry.observer.disconnect(); if (observers.get(key) === entry) observers.delete(key); }
    };
}
