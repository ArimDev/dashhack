export default apiHandler(async event=>{
    discordPrivateHeaders(event);
    if(event.method==='GET')return {status:200,data:getDiscordStore().owner(getCookie(event,'session'),getQuery(event).event)};
    if(event.method!=='POST')return {status:405,message:'Method Not Allowed'};
    discordSameOrigin(event);const {body}=await discordBody(event);
    return {status:200,data:getDiscordStore().configure(getCookie(event,'session'),body.event,body.config)};
});
