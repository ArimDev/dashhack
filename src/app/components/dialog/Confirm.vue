<template>
    <DialogShell :title="props.subject" @close="emit('close', false)">
        <p class="text-base leading-relaxed break-words">
            <template v-if="props.team">{{ messageBeforeTeam }}<strong>{{ props.team.name }}</strong>{{ messageAfterTeam }}</template>
            <template v-else>{{ props.message }}</template>
        </p>
        <template #footer>
            <button type="button" @click="emit('close', false)" class="dialog-secondary">Cancel</button>
            <button type="button" @click="confirmed" class="dialog-primary bg-red-700 hover:bg-red-800">Confirm</button>
        </template>
    </DialogShell>
</template>
<script setup>
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
            emit('close', true);
        }
    }
};
</script>