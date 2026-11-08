export default defineEventHandler(() => {
    getStore().db.query('SELECT 1').get();
    return { status: 'ok' };
});
