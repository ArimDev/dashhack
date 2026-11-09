<template>
    <DialogShell title="Log In" @close="close">
        <form :id="formId" @submit.prevent="login" class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-300">Enter the event password to make changes.</p>
            <label class="block text-sm font-medium">Password
                <input v-model="credentials.pass" @input="resetButton" required class="mt-2 w-full rounded-xl border border-gray-300 bg-transparent p-3 dark:border-gray-600" type="password" autocomplete="current-password" placeholder="Password">
            </label>
        </form>
        <template #footer>
            <button type="button" @click="close" class="dialog-secondary">Cancel</button>
            <button type="submit" :form="formId" :disabled="buttonDisable" :class="buttonClass" class="dialog-primary">{{ buttonText }}</button>
        </template>
    </DialogShell>
</template>
<script setup>
const { showToast } = useToast();
const formId = useId();
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