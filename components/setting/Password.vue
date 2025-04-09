<template>
    <form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-50 max-h-50 p-5 flex flex-col justify-between transition-colors duration-500">
        <div class="flex flex-row items-center gap-3 mb-4">
            <h1 class="text-3xl font-bold">Event Password</h1>
        </div>
        <div class="relative">
            <p class="mb-1">Change login access password:</p>
            <div class="flex flex-row gap-5">
                <div class="w-full">
                    <input v-model="oldPassword" required class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" type="password" autocomplete="current-password" placeholder="Current Password">
                </div>
                <div class="w-full">
                    <input v-model="newPassword" @change="autosave" required class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" type="password" autocomplete="new-password" placeholder="New Password">
                </div>
            </div>

        </div>
    </form>
</template>

<script setup>
const route = useRoute();
const eventName = ref(route.params.event);
const error = ref(false);

const oldPassword = ref(undefined),
    newPassword = ref(undefined);

async function autosave() {
    if (!oldPassword.value) return console.log("Old password not filled");

    const passCheck = await $fetch(`/api/auth/password`, {
        method: "POST",
        body: { username: eventName.value, password: oldPassword.value }
    });

    if (!passCheck || passCheck.status !== 200) return console.log("Old password is not correct!");

    let data = await $fetch(`/api/auth/update`, {
        method: "POST",
        body: { setting: "password", value: newPassword.value, oldPassword: oldPassword.value },
    });

    if (data.status !== 200) return console.log(data); // TODO: What's the error? AUTH API
}
</script>