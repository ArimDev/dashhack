<template>
    <form @submit.prevent="save" class="min-w-0 space-y-4 rounded-3xl bg-white p-5 text-black shadow-md dark:bg-gray-800 dark:text-white">
        <h1 class="text-xl font-bold sm:text-2xl">Event Password</h1>
        <p class="text-sm text-gray-600 dark:text-gray-300">Change the shared event login password.</p>
        <label class="block text-sm font-medium">Current password
            <input v-model="oldPassword" required :disabled="saving" class="mt-2 w-full rounded-xl border border-gray-300 bg-transparent p-3 dark:border-gray-600" type="password" autocomplete="current-password" placeholder="Current Password">
        </label>
        <label class="block text-sm font-medium">New password
            <input v-model="newPassword" required :disabled="saving" class="mt-2 w-full rounded-xl border border-gray-300 bg-transparent p-3 dark:border-gray-600" type="password" autocomplete="new-password" placeholder="New Password">
        </label>
        <button type="submit" :disabled="saving || !oldPassword || !newPassword" class="min-h-12 w-full rounded-xl bg-bluey-500 px-4 py-3 text-sm font-semibold text-white hover:bg-bluey-600 disabled:opacity-50">{{ saving ? 'Saving…' : 'Save password' }}</button>
        <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <p v-if="success" role="status" class="text-sm text-green-700 dark:text-green-400">Password updated.</p>
    </form>
</template>
<script setup>
import { notifySessionChange } from '../../utils/sessionSync.js';
const route = useRoute();
const oldPassword = ref(''), newPassword = ref(''), saving = ref(false), success = ref(false), error = ref('');
async function save() {
    if (saving.value) return;
    saving.value = true; error.value = ''; success.value = false;
    try {
        const response = await $fetch('/api/auth/update', { method: 'POST', body: {
            username: route.params.event, setting: 'password', value: newPassword.value, oldPassword: oldPassword.value,
        } });
        if (response.status !== 200) throw new Error(response.message || 'Could not update password.');
        oldPassword.value = ''; newPassword.value = ''; success.value = true;
        refreshCookie('sessionExists');
        notifySessionChange();
    } catch (failure) { error.value = failure.message || 'Could not update password.'; }
    finally { saving.value = false; }
}
</script>
