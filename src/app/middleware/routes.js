export default defineNuxtRouteMiddleware(async (to, from) => {
    const eventParam = String(to.params.event || '');
    if (!eventParam || !to.path.startsWith('/app/')) return;
    const currentEvent = useState('currentEvent', () => eventParam);
    currentEvent.value = eventParam;

    const response = await $fetch(`/api/event/${encodeURIComponent(currentEvent.value)}`);
    if(response.data?.event && response.data.event!==eventParam) {
        const parts=to.path.split('/');parts[2]=encodeURIComponent(response.data.event);
        return navigateTo({path:parts.join('/'),query:to.query,hash:to.hash},{replace:true});
    }
    const eventFetch = response.data;
    useState('eventCanEdit', () => false).value = !!response.canEdit;

    if (!eventFetch) throw createError({
        statusCode: 404,
        statusMessage: `Event "${eventParam}" doesn't exist!`,
    });

    const eventData = useState('eventData', () => eventFetch);
    eventData.value = eventFetch;

    if (to.path.endsWith("/") || to.path === `/app/${encodeURIComponent(eventParam)}`) {
        return navigateTo(`/app/${encodeURIComponent(eventParam)}/teams`);
    }
});
