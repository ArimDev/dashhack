<template>
    <details class="rounded-xl border border-gray-200 p-4 dark:border-gray-600" @toggle="onToggle">
        <summary class="cursor-pointer font-semibold">Student team invitations &amp; audit</summary>
        <p class="mt-3 text-sm">One link per team. Students sign in with GitHub. Valid for seven days.</p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Share only with that team. Revoke a link to stop new requests.</p>
        <div class="flex flex-wrap gap-3">
            <button @click="generate" :disabled="busy" class="mt-3 min-h-11 rounded-lg bg-bluey-500 px-3 text-sm font-semibold text-white disabled:opacity-50">Get team links</button>
            <button @click="refresh" :disabled="busy" class="mt-3 min-h-11 text-sm underline">Refresh audit</button>
            <button @click="revokeAll" :disabled="busy" class="mt-3 min-h-11 text-sm text-red-700 underline dark:text-red-300">Revoke all team links</button>
        </div>
        <p v-if="error" role="alert" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <template v-if="links.length">
            <p class="mt-3 text-sm">Copy and share with each team.</p>
            <button @click="copy" class="my-2 min-h-11 text-sm text-bluey-600 underline dark:text-bluey-400">{{ copied ? 'Copied' : 'Copy all team links' }}</button>
            <div v-for="(link,i) in links" :key="link.linkId || i" class="mt-3 min-w-0 text-sm">
                <label v-if="link.url" class="block font-semibold">{{ link.name }} · valid until {{ new Date(link.expiresAt).toLocaleString() }}
                    <input :value="link.url" readonly @focus="$event.target.select()" class="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-transparent px-2 font-normal dark:border-gray-600" />
                </label>
                <p v-else class="text-amber-700 dark:text-amber-300">{{ link.name }}: {{ link.error }}</p>
            </div>
        </template>
        <h3 class="mt-5 font-semibold">Recent invitations</h3>
        <ul class="mt-2 space-y-3 text-sm">
            <li v-for="invite in invitations" :key="invite.id" class="break-words rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <strong>{{ invite.name }}</strong> · {{ invite.state }}<span v-if="invite.username"> · {{ invite.username }}</span>
                <p class="text-xs text-gray-500">Expires {{ new Date(invite.expiresAt).toLocaleString() }} · {{ invite.id.slice(0,8) }}</p>
                <button v-if="invite.state==='active'" @click="manage('revoke',invite.id)" :disabled="busy" class="min-h-11 text-red-700 underline dark:text-red-300">Revoke this link</button>
            </li>
        </ul>
        <h3 class="mt-5 font-semibold">Audit trail</h3>
        <p class="mt-1 text-xs text-gray-500">Recent activity. Revoking links does not remove existing GitHub access.</p>
        <ul class="mt-2 space-y-2 text-sm">
            <li v-for="entry in audit" :key="entry.id" class="break-words rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                <p>{{ new Date(entry.createdAt).toLocaleString() }} · {{ entry.action }} · {{ entry.outcome }}</p>
                <p v-if="entry.username"><strong>{{ entry.username }}</strong> · {{ entry.verified ? `GitHub verified (ID ${entry.githubUserId})` : 'Unverified' }}</p>
                <p v-if="entry.actor" class="text-xs">Organizer session {{ entry.actor }}</p>
                <p class="break-all text-xs text-gray-500 dark:text-gray-400">{{ entry.ip }} · {{ entry.userAgent }} · Request {{ entry.requestId }}</p>
            </li>
        </ul>
    </details>
</template>
<script setup>
const currentEvent=useState('currentEvent');
const links=ref([]),busy=ref(false),error=ref(''),copied=ref(false),invitations=ref([]),audit=ref([]);
async function request(body) {
    const response=await $fetch('/api/github/app/team-invites',{method:'POST',body:{event:currentEvent.value,...body}});
    if(response.status!==200) throw new Error(response.message || 'Could not manage invitations.');return response;
}
async function manage(action,linkId) {
    busy.value=true;error.value='';
    try {const response=await request({action,linkId});invitations.value=response.invitations;audit.value=response.audit;links.value=links.value.filter(link=>response.invitations.some(i=>i.id===link.linkId && i.state==='active' && i.expiresAt>Date.now()));}
    catch(failure){error.value=failure.message;} finally{busy.value=false;}
}
async function refresh(){await manage('list');}
async function onToggle(event){if(event.target.open) await refresh();}
async function revokeAll(){if(!window.confirm('Revoke every team invitation link for this event? Existing GitHub access is unchanged.')) return;await manage('revokeAll');links.value=[];}
async function generate(){
    busy.value=true;error.value='';copied.value=false;
    try{const response=await request({action:'issue'});links.value=response.links;const listing=await request({action:'list'});invitations.value=listing.invitations;audit.value=listing.audit;}
    catch(failure){error.value=failure.message;} finally{busy.value=false;}
}
async function copy(){try{await navigator.clipboard.writeText(links.value.filter(l=>l.url).map(l=>`${l.name}\t${l.url}`).join('\n'));copied.value=true;}catch{error.value='Clipboard is unavailable. Select and copy each link below.';}}
</script>
