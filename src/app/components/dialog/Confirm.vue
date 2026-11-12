<template>
    <DialogShell :title="props.subject" @close="emit('close', false)">
        <p class="text-base leading-relaxed break-words">
            <template v-if="props.team">{{ messageBeforeTeam }}<strong>{{ props.team.name }}</strong>{{ messageAfterTeam }}</template>
            <template v-else>{{ props.message }}</template>
        </p>
        <div v-if="props.team" class="mt-4 space-y-3">
            <p class="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">This permanently deletes the team, its notes, project details and startup matrix. This cannot be undone.</p>
            <label class="block text-sm font-semibold">Type the team name to confirm
                <input v-model="confirmationName" autocomplete="off" spellcheck="false" class="mt-2 block min-h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 dark:border-gray-600" />
            </label>
        </div>
        <template #footer>
            <button type="button" :disabled="busy" @click="emit('close', false)" class="dialog-secondary">Cancel</button>
            <button type="button" :disabled="busy || (props.team && confirmationName !== props.team.name)" @click="confirmed" class="dialog-primary bg-red-700 hover:bg-red-800 disabled:opacity-50">{{ busy ? 'Please wait…' : props.team ? 'Delete team permanently' : 'Confirm' }}</button>
        </template>
    </DialogShell>
</template>
<script setup>
import { notifySessionChange } from '../../utils/sessionSync.js';
const { showToast } = useToast();
const emit = defineEmits(["close"]);
const props = defineProps({
    subject: String,
    message: String,
    team: {
        type: [Object, Boolean],
        required: false
    },
});
const confirmationName = ref(''), busy = ref(false);

const messageBeforeTeam = computed(() => {
    if (!props.team) return '';
    const parts = props.message.split('$var');
    return parts[0] || '';
});

const messageAfterTeam = computed(() => {
    if (!props.team) return '';
    const parts = props.message.split('$var');
    return parts[1] || '';
});

const route = useRoute();
const eventName = ref(route.params.event);

async function confirmed() {
    if (busy.value || (props.team && confirmationName.value !== props.team.name)) return;
    busy.value = true;
    try {
    if (!!props.team) { //or if (props.subject === "Delete Team")
        const teamData = {
            username: eventName.value,
            teamName: props.team.name,
            teamId: props.team._id
        };

        let data = await $fetch(`/api/team/delete/`, {
            method: "DELETE",
            body: teamData
        });

        if (!data || data.status !== 200) {
            console.log(data);

            showToast("Failed to delete the team!", data?.message);
        } else emit('close', true);
    } else if (props.subject === "Log Off") {
        let data = await $fetch(`/api/auth/logout/`, {
            method: "DELETE"
        });

        if (!data || ![200, 204].includes(data.status)) {
            console.log(data);

            showToast("Failed to log out!", data?.message);
        } else {
            if (data.status === 204) console.log(data);
            notifySessionChange();
            emit('close', true);
        }
    }
    } catch (error) { showToast('Action failed', error.message || 'Please try again.'); }
    finally { busy.value = false; }
};
</script>
