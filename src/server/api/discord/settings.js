export default apiHandler(async event=>{
    discordPrivateHeaders(event);
    const result=(name,data)=>({status:200,data:{...data,notifications:mentorNotificationStatus(getStore().authorize(getCookie(event,'session'),name))}});
    if(event.method==='GET'){const name=getQuery(event).event;return result(name,getDiscordStore().owner(getCookie(event,'session'),name));}
    if(event.method!=='POST')return {status:405,message:'Method Not Allowed'};
    discordSameOrigin(event);const {body}=await discordBody(event);
    return result(body.event,getDiscordStore().configure(getCookie(event,'session'),body.event,body.config));
});
