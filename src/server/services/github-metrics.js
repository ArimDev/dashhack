const HOUR=3600000,TTL=120000;
export class GitHubMetricsService {
    constructor(store,{request=fetch,now=Date.now}={}){this.store=store;this.request=request;this.now=now;this.pending=new Map();this.tail=Promise.resolve();}
    async get(context){
        const key=JSON.stringify([context.eventId,context.repository,context.scope]);
        if(this.pending.has(key))return this.pending.get(key);
        if(this.pending.size>=32)return {status:503,message:'Metrics are busy. Please try again shortly.'};
        const job=this.load(context).finally(()=>this.pending.delete(key));this.pending.set(key,job);return job;
    }
    async load({eventId,repository,scope,token}){
        const row=this.store.db.query('SELECT scope,data FROM github_metrics_cache WHERE event_id=? AND repository=?').get(eventId,repository);
        const cache=row?.scope===scope?JSON.parse(row.data):{pages:[],details:{},checkedAt:0};
        let reqs=0;
        const save=()=>this.store.db.query(`INSERT INTO github_metrics_cache(event_id,repository,scope,data) VALUES(?,?,?,?) ON CONFLICT(event_id,repository) DO UPDATE SET scope=excluded.scope,data=excluded.data`).run(eventId,repository,scope,JSON.stringify(cache));
        if(cache.failure&&cache.failure.retryAt>this.now())return this.failure(cache,reqs);
        if(cache.checkedAt&&this.now()-cache.checkedAt<TTL)return this.result(cache,reqs,true);
        const since=new Date(Math.floor(this.now()/HOUR)*HOUR-23*HOUR).toISOString(),base=`https://api.github.com/repos/${repository}/commits`;
        const read=async(url,etag)=>{
            const operation=async()=>{
                reqs++;
                const response=await this.request(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json',...(etag?{'If-None-Match':etag}:{})},signal:AbortSignal.timeout(10000),redirect:'error'});
                if(response.status===304)return {unchanged:true};
                if(response.status===409&&url.includes('?'))return {items:[],etag:null,next:false};
                if(!response.ok){
                    const rate=response.status===429||response.status===403&&(response.headers.get('x-ratelimit-remaining')==='0'||response.headers.has('retry-after'));
                    const reset=Number(response.headers.get('x-ratelimit-reset')),after=Number(response.headers.get('retry-after'));
                    const retry=Math.max(this.now()+60000,Number.isFinite(reset)&&reset>0?Math.min(reset*1000,this.now()+86400000):0,Number.isFinite(after)&&after>0?this.now()+Math.min(after*1000,86400000):0);
                    throw Object.assign(Error(rate?'GitHub rate limit reached. Cached data will retry later.':`GitHub metrics unavailable (${response.status}).`),{status:response.status,rate,retryAt:rate?retry:this.now()+TTL});
                }
                return {items:await response.json(),etag:response.headers.get('etag'),next:/rel="next"/.test(response.headers.get('link')||'')};
            };
            const job=this.tail.then(operation,operation);this.tail=job.catch(()=>{});return job;
        };
        try{
            const pages=[];let next=true;
            for(let page=1;page<=10&&next;page++){
                const old=cache.since===since?cache.pages[page-1]:null;
                const fresh=await read(`${base}?since=${encodeURIComponent(since)}&per_page=100&page=${page}`,old?.etag),data=fresh.unchanged?old:fresh;
                if(!data||!Array.isArray(data.items))throw Error('Invalid GitHub response');
                // Persist only hashes, timestamps and aggregate identity keys; no source/email.
                const items=fresh.unchanged?data.items:data.items.map(c=>({sha:c.sha,date:c.commit?.committer?.date,author:c.author?.id?String(c.author.id):c.commit?.author?.name||''})).filter(c=>/^[a-f0-9]{40,64}$/.test(c.sha)&&Number.isFinite(Date.parse(c.date))).slice(0,100);
                pages.push({items,etag:data.etag,next:data.next});next=data.next;
            }
            const commits=[...new Map(pages.flatMap(p=>p.items).map(c=>[c.sha,c])).values()].slice(0,1000);
            const details=Object.fromEntries(commits.filter(c=>cache.details[c.sha]).map(c=>[c.sha,cache.details[c.sha]]));
            const started=Date.now();let fetched=0;
            for(const commit of commits){
                if(details[commit.sha])continue;
                if(fetched>=20||Date.now()-started>18000)break;
                const response=await read(`${base}/${commit.sha}`),stats=response.items?.stats;
                if(!stats||!['additions','deletions','total'].every(key=>Number.isSafeInteger(stats[key])&&stats[key]>=0))throw Error('Invalid GitHub statistics');
                details[commit.sha]={additions:stats.additions,deletions:stats.deletions,total:stats.total};
                cache.details[commit.sha]=details[commit.sha];fetched++;
            }
            Object.assign(cache,{pages,details,since,truncated:next,checkedAt:this.now(),failure:null});save();return this.result(cache,reqs,false);
        }catch(error){
            const status=error.status||502;
            cache.failure={status,message:error.status?error.message:'GitHub metrics could not be refreshed.',retryAt:error.retryAt||this.now()+TTL,allowStale:!!cache.checkedAt&&(error.rate||![401,403,404].includes(status))};save();return this.failure(cache,reqs);
        }
    }
    failure(cache,reqs){
        if(cache.failure.allowStale)return {...this.result(cache,reqs,true),stale:true,warning:cache.failure.message,retryAt:new Date(cache.failure.retryAt).toISOString()};
        return {status:cache.failure.status,message:cache.failure.message,reqs,retryAt:new Date(cache.failure.retryAt).toISOString()};
    }
    result(cache,reqs,cached){
        const end=Math.floor(this.now()/HOUR)*HOUR,buckets=Array.from({length:24},(_,i)=>({at:new Date(end-i*HOUR).toISOString(),commits:0,lines:0,additions:0,deletions:0}));
        const authors=new Set();let lastCommitAt=null,pending=0;
        for(const commit of new Map(cache.pages.flatMap(p=>p.items).map(c=>[c.sha,c])).values()){
            const i=Math.floor((end+HOUR-1-Date.parse(commit.date))/HOUR);if(i<0||i>=24)continue;
            buckets[i].commits++;if(commit.author)authors.add(commit.author);if(!lastCommitAt||commit.date>lastCommitAt)lastCommitAt=commit.date;
            const stats=cache.details[commit.sha];if(stats){buckets[i].lines+=stats.total;buckets[i].additions+=stats.additions;buckets[i].deletions+=stats.deletions;}else pending++;
        }
        return {status:200,commits:buckets.map(b=>b.commits),diff:buckets.map(b=>b.lines),hours:buckets.map(b=>b.at),additions:buckets.reduce((n,b)=>n+b.additions,0),deletions:buckets.reduce((n,b)=>n+b.deletions,0),contributors:authors.size,lastCommitAt,
            checkedAt:new Date(cache.checkedAt).toISOString(),nextCheckAt:new Date(cache.checkedAt+TTL).toISOString(),pendingDetails:pending,partial:!!cache.truncated||pending>0,truncated:!!cache.truncated,cached,reqs};
    }
}
