export default apiHandler(async event=>{
    discordPrivateHeaders(event);const store=getDiscordStore(),cookie=getCookie(event,'discordMatrixSession');
    if(event.method==='GET')return {status:200,data:store.matrix(cookie)};
    if(!['POST','PATCH'].includes(event.method))return {status:405,message:'Method Not Allowed'};
    discordSameOrigin(event);
    // Authenticate before buffering a potentially large rich-text save.
    if(event.method==='PATCH')store.session(cookie);
    const {body}=await discordBody(event,event.method==='PATCH'?6*1024*1024:16384);
    if(event.method==='POST'){
        const claimed=store.claim(body.id,body.token,cookie);
        setCookie(event,'discordMatrixSession',claimed.cookie,{httpOnly:true,secure:!import.meta.dev,sameSite:'strict',path:'/api/discord/matrix',maxAge:7200});
        return {status:200,data:claimed.data};
    }
    return {status:200,data:store.saveMatrix(cookie,body)};
});
