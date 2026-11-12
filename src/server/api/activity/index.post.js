export default apiHandler(async event=>{
    const body=await readBody(event);
    getStore().addWorknote(getCookie(event,'session'),body.event,body);
    return {status:200};
});
