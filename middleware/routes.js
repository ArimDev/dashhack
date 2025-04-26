export default defineNuxtRouteMiddleware((to, from) => {
    const eventParam = to.fullPath.match(/^\/[^\/]+\/([^\/]+)/)?.[1];
    const currentEvent = useState('currentEvent', () => eventParam);
    currentEvent.value = eventParam;
});