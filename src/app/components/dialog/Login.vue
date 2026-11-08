<template>
    <div>
        <div @click="close" class="absolute inset-0 bg-black opacity-45"></div>
        <div class="relative inset-0 flex justify-center items-center z-[100]">
            <form @submit.prevent="login" class="fixed bg-white text-black dark:bg-gray-800 dark:text-white rounded-3xl w-[50%] h-[40%] p-[2%] flex justify-between flex-col">
                <div>
                    <h1 class="text-left text-3xl font-bold">Log In</h1>
                </div>

                <div>
                    <p>Enter password to be able making changes.</p>
                    <input v-model="credentials.pass" @input="resetButton" required class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" type="password" autocomplete="current-password" placeholder="Password">
                </div>

                <div class="flex justify-between gap-70 flex-row">
                    <button @click="close" class="cursor-pointer rounded-full bg-zinc-300 w-full h-[56px] text-xl font-bold text-black">
                        Cancel
                    </button>
                    <button type="submit" :disabled="buttonDisable" :class="`cursor-pointer rounded-full w-full h-[56px] text-xl font-bold ${buttonClass}`">
                        {{ buttonText }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
const { showToast } = useToast();
const emit = defineEmits(["close"]);
const route = useRoute();
const eventName = ref(route.params.event);
const eventCanEdit = useState('eventCanEdit', () => false);
const eventData = useState('eventData');

const buttonText = ref("Log In");
const buttonDisable = ref(false);
const buttonClass = computed(() =>
    buttonText.value === "Log In"
        ? ("bg-bluey-500 text-white" + (buttonDisable.value ? "" : " hover:bg-bluey-600"))
        : ("bg-red-700 text-white" + (buttonDisable.value ? "" : " hover:bg-red-800"))
);

const credentials = ref({ user: eventName.value, pass: "" });

async function login() {
    const data = await $fetch(`/api/auth/login`, {
        method: "POST",
        body: { username: credentials.value.user, password: credentials.value.pass }
    });

    if (!data || data.status !== 200) {
        buttonText.value = "Wrong Password!";
        buttonDisable.value = true;
        console.log("Failed to log in: ", data);

        showToast("Failed to log in!", data?.message);
    } else {
        refreshCookie('sessionExists');
        const response = await $fetch(`/api/event/${encodeURIComponent(route.params.event)}`);
        eventCanEdit.value = !!response.canEdit;
        if (response.data) eventData.value = response.data;
        close();
    }
};

function close() {
    resetButton();
    emit('close');
}

function resetButton() {
    buttonText.value = "Log In";
    buttonDisable.value = false;
}
</script>