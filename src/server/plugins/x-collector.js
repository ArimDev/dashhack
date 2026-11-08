import { XCollector } from '../services/x-collector.js';

export default defineNitroPlugin(nitro => {
    const token = useRuntimeConfig().xBearerToken;
    if (!token) return;
    const collector = new XCollector(getStore(),token);
    let ticking = false;
    const tick = async () => {
        if (ticking) return;
        ticking = true;
        try { await collector.tick(); } catch { console.warn('X collector could not check enabled walls.'); }
        finally { ticking = false; }
    };
    const timer = setInterval(tick,60000);
    timer.unref?.();
    void tick();
    nitro.hooks.hook('close',() => clearInterval(timer));
});
