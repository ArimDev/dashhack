<template>
    <div>
        <div @click="emit('close', false)" class="absolute inset-0 bg-black opacity-45"></div>
        <div class="relative inset-0 flex justify-center items-center z-[100]">
            <div class="fixed bg-white text-black dark:bg-gray-800 dark:text-white rounded-3xl w-[50%] h-[30%] p-[2%] flex justify-between flex-col">
                <div>
                    <h1 class="text-left text-3xl font-bold">{{ props.subject }}</h1>
                </div>

                <div class="text-xl" v-html="message"></div>

                <div class="flex justify-between gap-70 flex-row">
                    <button @click="emit('close', false)" class="cursor-pointer rounded-full bg-zinc-300 w-full h-[56px] text-xl font-bold text-black">
                        Cancel
                    </button>
                    <button @click="confirmed()" class="cursor-pointer rounded-full bg-red-800 w-full h-[56px] text-xl font-bold text-white">
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const emit = defineEmits(["close"]);
const props = defineProps({
    subject: String,
    message: String,
    team: {
        type: [Object, Boolean],
        required: false
    },
});

const message = computed(() => {
    if (!!props.team)
        return props.message.replace("$var", `<strong>${props.team.name}</strong>`);
    else
        return props.message;
});

const route = useRoute();
const eventName = ref(route.params.event);

async function confirmed() {
    if (!!props.team) { //or if (props.subject === "Delete Team")
        const teamData = {
            username: eventName.value,
            teamName: props.team.name
        };

        let data = await $fetch(`/api/team/delete/`, {
            method: "DELETE",
            body: teamData
        });

        if (!data || data.status !== 200) {
            console.log(data);

            // TODO: Display Toast (Auth Logout)
        } else emit('close', true);
    } else if (props.subject === "Log Off") {
        let data = await $fetch(`/api/auth/logout/`, {
            method: "DELETE"
        });

        if (!data || ![200, 204].includes(data.status)) {
            console.log(data);

            // TODO: Display Toast (Auth Logout)
        } else {
            if (data.status === 204) console.log(data);
            emit('close', true);
        }
    }
};
</script>