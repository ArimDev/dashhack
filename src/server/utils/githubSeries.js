import {createHash} from 'node:crypto';
import {parseGitHubRepository} from '../services/github-app.js';
import {GitHubMetricsService} from '../services/github-metrics.js';
let metrics;
export default async function githubSeries(url,name){
    try{
        const repository=parseGitHubRepository(url).toLowerCase();
        const token=await githubCredential(name,repository);
        const store=getStore(),event=store.getEvent(name),connection=store.githubConnection(name);
        const scope=createHash('sha256').update(connection?JSON.stringify([connection.app_id,connection.installation_id]):event.settings.githubToken).digest('hex');
        metrics ||= new GitHubMetricsService(store);
        return await metrics.get({eventId:event._id,repository,scope,token});
    }catch(error){return {status:error.status||502,message:error.status?error.message:'GitHub metrics unavailable.',reqs:0};}
}