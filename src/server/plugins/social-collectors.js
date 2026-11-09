import { XCollector } from '../services/x-collector.js';
import { InstagramCollector } from '../services/instagram-collector.js';

export default defineNitroPlugin(nitro => {
    const token = useRuntimeConfig().xBearerToken;
    const key = process.env.NUXT_CAPTAPI_API_KEY;
    if (!token && !key) return;
    const collectors = [];
    if (token) collectors.push({ name: 'X', collector: new XCollector(getStore(), token) });
    if (key) collectors.push({ name: 'Instagram', collector: new InstagramCollector(getStore(), key) });
    let ticking = false;
    const tick = async () => {
        if (ticking) return;
        ticking = true;
        try {
            for (const { name, collector } of collectors) {
                try { await collector.tick(); } catch { console.warn(`${name} collector could not check enabled walls.`); }
            }
        }
        finally { ticking = false; }
    };
    const timer = setInterval(tick,60000);
    timer.unref?.();
    void tick();
    nitro.hooks.hook('close',() => clearInterval(timer));
});