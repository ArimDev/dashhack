export default apiHandler(async (event) => {
    const { username, setting, value, oldPassword, revision } = await readBody(event);
    if (setting === 'wall.xCollector' || setting === 'wall.queryHashtags') {
        const patch = setting === 'wall.queryHashtags' ? { queryHashtags: value } : {
            xEnabled: value?.enabled, xPollIntervalMinutes: value?.intervalMinutes,
            xQueryHashtags: value?.hashtags, xQueryHandles: value?.handles,
        };
        const wall = getWallStore().updateSettings(getCookie(event, 'session'), username, patch, revision);
        return { status: 200, message: 'Wall settings updated', wall };
    }
    const newSession = await getStore().updateSetting(getCookie(event, 'session'), username, setting, value, oldPassword);
    if (newSession) setSessionCookies(event, newSession);
    return { status: 200, message: 'Setting changed successfully' };
});
