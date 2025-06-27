export default defineNuxtRouteMiddleware(async (to, from) => {
    const eventParam = to.fullPath.match(/^\/[^\/]+\/([^\/]+)/)?.[1];
    const currentEvent = useState('currentEvent', () => eventParam);
    currentEvent.value = eventParam;

    const eventFetch = (await $fetch(`/api/event/${currentEvent.value}`)).data;

    if (!eventFetch) throw createError({
        statusCode: 404,
        statusMessage: `Event "${eventParam}" doesn't exist!`,
    });

    const eventData = useState('eventData', () => eventFetch);
    eventData.value = eventFetch;

    if (to.path.endsWith("/") || to.path.endsWith(eventParam)) {
        return navigateTo("/app/" + eventParam + "/teams");
    }
});