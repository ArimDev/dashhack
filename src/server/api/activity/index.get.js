export default apiHandler(event=>{
    setHeader(event,'Cache-Control','no-store');
    const query=getQuery(event);
    return {status:200,...getStore().activity(getCookie(event,'session'),query.event,{teamId:query.teamId||'',before:query.before,limit:query.limit||30})};
});
