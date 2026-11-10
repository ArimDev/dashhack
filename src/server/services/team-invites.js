import { createHmac, timingSafeEqual, randomBytes, randomUUID } from 'node:crypto';
import { StorageError } from '../storage/sqlite.js';
import { parseGitHubRepository } from './github-app.js';
const fail = (status, message) => { throw new StorageError(status, message); };
export class TeamInvites {
    constructor(store, app, secret) { this.store = store; this.app = app; this.secret = secret; }
    ready() {
        this.app.requireConfig();
        if (typeof this.secret !== 'string' || this.secret.length < 32) fail(503, 'Team invitation links are temporarily disabled. Contact the organizer.');
    }
    hash(value) { return createHmac('sha256', this.secret).update(value).digest('hex'); }
    matches(value, expected) { return timingSafeEqual(Buffer.from(this.hash(value)), Buffer.from(expected)); }
    audit(context, action, outcome, fields = {}) {
        const entry = { ...context, ...fields };
        this.store.db.query(`INSERT INTO team_invite_audit(id,event_id,team_id,link_id,created_at,action,outcome,username,verified,github_user_id,actor,ip,user_agent,request_id)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(), entry.eventId || null, entry.teamId || '', entry.linkId || '', this.store.now(), action, outcome,
            (entry.username || '').slice(0,39), entry.verified ? 1 : 0, String(entry.githubUserId || ''), entry.actor || '', (entry.ip || '').slice(0,64), (entry.userAgent || '').slice(0,300), entry.requestId || randomUUID());
        // Bounded storage: up to 5,000 recent entries per event (including unknown-link attempts).
        this.store.db.query('DELETE FROM team_invite_audit WHERE event_id IS ? AND id NOT IN (SELECT id FROM team_invite_audit WHERE event_id IS ? ORDER BY created_at DESC,rowid DESC LIMIT 5000)').run(entry.eventId || null, entry.eventId || null);
    }
    issue(session, name, { teamId } = {}, context = {}) {
        const eventId=this.store.authorize(session,name);this.ready();
        const event=this.store.getEvent(name),connection=this.store.githubConnection(name);
        if(!connection || connection.account_type!=='Organization' || connection.app_id!==String(this.app.config.githubAppId)) fail(400,'Connect this event to its organization GitHub App first.');
        const teams=teamId?event.teams.filter(t=>t._id===teamId):event.teams;
        if(teamId && !teams.length) fail(404,'Team not found.');
        const actor=this.hash(session).slice(0,16);
        return this.store.db.transaction(()=>{
            this.store.db.query("UPDATE team_invite_links SET state='revoked' WHERE expires_at<=? AND state='active'").run(this.store.now());
            const links=[];
            for(const team of teams) {
                let repository;
                try{repository=parseGitHubRepository(team.github);}catch{links.push({teamId:team._id,name:team.name,error:'No valid repository assigned'});continue;}
                if(repository.split('/')[0].toLowerCase()!==connection.account.toLowerCase()){links.push({teamId:team._id,name:team.name,error:'Repository is outside the connected organization'});continue;}
                let row=this.store.db.query("SELECT * FROM team_invite_links WHERE team_id=? AND event_id=? AND state='active' ORDER BY created_at DESC LIMIT 1").get(team._id,eventId);
                let token=row?row.id+'.'+this.hash('team-link:'+row.id):'';
                if(row && (row.repository!==repository || row.installation_id!==connection.installation_id || !this.matches(token,row.token_hash))) {
                    this.store.db.query("UPDATE team_invite_links SET state='revoked' WHERE id=?").run(row.id);row=null;
                }
                if(!row) {
                    const id=randomUUID(),expiresAt=this.store.now()+7*86400000;token=id+'.'+this.hash('team-link:'+id);
                    this.store.db.query('INSERT INTO team_invite_links(id,event_id,team_id,repository,installation_id,token_hash,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').run(id,eventId,team._id,repository,connection.installation_id,this.hash(token),this.store.now(),expiresAt);
                    row={id,expires_at:expiresAt};
                    this.audit({...context,eventId,teamId:team._id,linkId:id,actor},'issue','created');
                }
                links.push({linkId:row.id,teamId:team._id,name:team.name,repository,expiresAt:row.expires_at,url:new URL('/join',this.app.config.githubAppBaseUrl).href+'#'+token});
            }
            return {links};
        })();
    }
    linkForTeam(eventId, teamId) {
        this.ready();
        const row=this.store.db.query("SELECT * FROM team_invite_links WHERE event_id=? AND team_id=? AND state='active' AND expires_at>? ORDER BY created_at DESC LIMIT 1").get(eventId,teamId,this.store.now());
        if(!row) fail(404,'Pozvánka týmu není připravená nebo vypršela. Požádejte pořadatele o nový odkaz.');
        const token=row.id+'.'+this.hash('team-link:'+row.id),team=this.resolve(token);
        return {...team,url:new URL('/join',this.app.config.githubAppBaseUrl).href+'#'+token};
    }
    teamForLink(row) {
        if (!row || row.state!=='active' || row.expires_at<=this.store.now()) fail(404,'This invitation is invalid, expired or revoked. Ask the organizer for a new one.');
        const team=this.store.db.query('SELECT teams.name,teams.github,events.name event FROM teams JOIN events ON events.id=teams.event_id WHERE teams.id=? AND teams.event_id=?').get(row.team_id,row.event_id);
        const connection=team && this.store.githubConnection(team.event);
        if (!connection || connection.app_id!==String(this.app.config.githubAppId) || connection.installation_id!==row.installation_id || parseGitHubRepository(team.github)!==row.repository || row.repository.split('/')[0].toLowerCase()!==connection.account.toLowerCase()) fail(410,'This team repository connection changed. Ask the organizer for a new link.');
        return {linkId:row.id,eventId:row.event_id,teamId:row.team_id,name:team.name,repository:row.repository,expiresAt:row.expires_at,installationId:row.installation_id};
    }
    resolve(token) {
        this.ready();
        if (typeof token!=='string' || !/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token)) fail(404,'This invitation is invalid or expired.');
        const row=this.store.db.query('SELECT * FROM team_invite_links WHERE id=?').get(token.split('.')[0]);
        if (!row || !this.matches(token,row.token_hash)) fail(404,'This invitation is invalid or expired.');
        return this.teamForLink(row);
    }
    begin(token, browser, context = {}) {
        const team=this.resolve(token),id='student_'+randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
        this.store.db.query('DELETE FROM team_invite_flows WHERE expires_at<=?').run(this.store.now());
        if(this.store.db.query('SELECT COUNT(*) n FROM team_invite_flows').get().n>=2000) fail(429,'Too many sign-in attempts. Try again later.');
        this.store.db.query('INSERT INTO team_invite_flows(id,link_id,browser_hash,verifier,expires_at) VALUES(?,?,?,?,?)').run(id,team.linkId,this.hash(browser),verifier,this.store.now()+600000);
        this.audit({...context,...team},'oauth_start','started');
        return {id,verifier};
    }
    flow(id, browser, state) {
        this.ready();
        if(typeof id!=='string' || !/^student_[A-Za-z0-9_-]{43}$/.test(id) || typeof browser!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(browser)) fail(403,'GitHub sign-in could not be verified. Reopen your team link.');
        const flow=this.store.db.query('SELECT * FROM team_invite_flows WHERE id=?').get(id);
        if(!flow || !this.matches(browser,flow.browser_hash) || flow.expires_at<=this.store.now() || (state && flow.state!==state)) fail(403,'GitHub sign-in expired or was already used. Reopen your team link.');
        return flow;
    }
    async verify(id, browser, code, context = {}) {
        const flow=this.flow(id,browser,'started');
        const team=this.teamForLink(this.store.db.query('SELECT * FROM team_invite_links WHERE id=?').get(flow.link_id));
        if(!this.store.db.query("UPDATE team_invite_flows SET state='exchanging' WHERE id=? AND state='started'").run(id).changes) fail(409,'GitHub sign-in was already used.');
        let userToken;
        try {
            userToken=await this.app.exchange(code,flow.verifier);
            const user=await this.app.api('/user',userToken);
            if(user.type!=='User' || !Number.isSafeInteger(user.id) || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(user.login)) fail(403,'Sign in with your personal GitHub account.');
            this.store.db.query("UPDATE team_invite_flows SET state='verified',verifier='',github_user_id=?,username=? WHERE id=?").run(String(user.id),user.login,id);
            this.audit({...context,...team,username:user.login,githubUserId:user.id,verified:true},'oauth_verified','verified');
            return {claimId:id,username:user.login,team:{name:team.name,repository:team.repository}};
        } catch(error) {this.store.db.query("UPDATE team_invite_flows SET state='failed',verifier='' WHERE id=?").run(id);this.audit({...context,...team},'oauth_verified','failed');throw error;}
        finally {if(userToken) {try {await this.app.revokeUserToken(userToken);} catch {this.audit({...context,...team},'oauth_token_revoke','failed');}}}
    }
    async claim(id, browser, context = {}) {
        const flow=this.flow(id,browser);
        if(flow.state==='completed' && flow.result) return JSON.parse(flow.result);
        if(flow.state!=='verified') fail(403,'Sign in with GitHub before requesting repository access.');
        const team=this.teamForLink(this.store.db.query('SELECT * FROM team_invite_links WHERE id=?').get(flow.link_id));
        const actor={...context,verified:true,githubUserId:flow.github_user_id};
        const previous=this.store.db.query("SELECT result,state FROM team_invite_flows WHERE link_id=? AND github_user_id=? AND state IN ('claiming','completed') AND id<>? ORDER BY expires_at DESC LIMIT 1").get(flow.link_id,flow.github_user_id,id);
        if(previous?.state==='completed' && previous.result) {
            this.store.db.query("UPDATE team_invite_flows SET state='completed',result=? WHERE id=? AND state='verified'").run(previous.result,id);
            this.audit({...actor,...team,username:flow.username},'claim','already_requested');return JSON.parse(previous.result);
        }
        if(previous) fail(409,'Your invitation is already being processed. Please wait.');
        if(!this.store.db.query("UPDATE team_invite_flows SET state='claiming' WHERE id=? AND state='verified'").run(id).changes) fail(409,'Your invitation is already being processed.');
        this.audit({...actor,...team,username:flow.username},'claim','processing');
        try {
            const result=await this.app.inviteCollaborator(team.installationId,team.repository,flow.username,flow.github_user_id);
            this.store.db.transaction(()=>{
                this.audit({...actor,...team,username:result.username},'claim',result.alreadyHasAccess?'already_has_access':'invitation_sent');
                this.store.db.query("UPDATE team_invite_flows SET state='completed',result=? WHERE id=?").run(JSON.stringify(result),id);
            })();
            return result;
        } catch(error) {
            // A provider timeout may follow a successful invitation; do not retry the same flow automatically.
            this.audit({...actor,...team,username:flow.username},'claim','provider_error');
            this.store.db.query("UPDATE team_invite_flows SET state='failed' WHERE id=?").run(id);throw error;
        }
    }
    manage(session, name, {action,linkId} = {}, context = {}) {
        const eventId=this.store.authorize(session,name),actor=this.hash(session).slice(0,16);
        if (action==='revoke' || action==='revokeAll') {
            this.store.db.transaction(()=>{
                if(action==='revoke' && typeof linkId!=='string') fail(400,'Choose an invitation.');
                if(action==='revoke') this.store.db.query("UPDATE team_invite_links SET state='revoked' WHERE id=? AND event_id=? AND state='active'").run(linkId,eventId);
                else this.store.db.query("UPDATE team_invite_links SET state='revoked' WHERE event_id=? AND state='active'").run(eventId);
                this.audit({...context,eventId,actor,linkId:action==='revoke'?linkId:''},action,'revoked');
            })();
        } else if(action!=='list') fail(400,'Invalid invitation action.');
        return {
            invitations:this.store.db.query('SELECT l.id,l.team_id teamId,t.name,l.repository,l.created_at createdAt,l.expires_at expiresAt,l.state FROM team_invite_links l JOIN teams t ON t.id=l.team_id WHERE l.event_id=? ORDER BY l.created_at DESC,l.rowid DESC LIMIT 200').all(eventId),
            audit:this.store.db.query('SELECT id,team_id teamId,link_id linkId,created_at createdAt,action,outcome,username,verified,github_user_id githubUserId,actor,ip,user_agent userAgent,request_id requestId FROM team_invite_audit WHERE event_id=? ORDER BY created_at DESC,rowid DESC LIMIT 200').all(eventId)
        };
    }
}

// Small bounded in-process admission: one web replica, no worker/database writes.
export class TeamInviteGate {
    constructor({ now = Date.now } = {}) { this.now = now; this.windows = new Map(); this.running = new Set(); }
    enter(teamId, username, network) {
        const now = this.now(), duration = 600000;
        for (const [key, entry] of this.windows) if (entry.until <= now) this.windows.delete(key);
        const requestKey = `${teamId}:${username.toLowerCase()}`;
        if (this.running.size >= 4 || this.running.has(requestKey)) fail(429, 'Another invitation is being processed. Wait a moment and retry.');
        const limits = [['global', 600], [`network:${network}`, 300], [`team:${teamId}`, 500], [`user:${requestKey}`, 300]];
        if (this.windows.size + limits.length > 2048 || limits.some(([key, limit]) => (this.windows.get(key)?.count || 0) >= limit)) fail(429, 'Too many invitation attempts. Wait up to ten minutes before retrying.');
        for (const [key] of limits) {
            const entry = this.windows.get(key) || { count: 0, until: now + duration };
            entry.count++; this.windows.set(key, entry);
        }
        this.running.add(requestKey);
        return () => this.running.delete(requestKey);
    }
}
