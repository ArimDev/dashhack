<template>
    <form @submit.prevent class="rounded-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-50 max-h-50 p-5 flex flex-col justify-between transition-colors duration-500">
        <div class="flex flex-row items-center gap-3 mb-4">
            <h1 class="text-3xl font-bold">Event Password</h1>
        </div>
        <div>
            <p class="mb-1">Change login access password:</p>
            <div class="flex flex-row gap-5">
                <div class="w-full">
                    <input v-model="oldPassword" required class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" type="password" autocomplete="current-password" placeholder="Current Password">
                </div>
                <div class="w-full">
                    <input v-model="newPassword" required class="mb-4 p-3 border-2 h-[50px] rounded-xl text-sm font-semibold w-full trans-all-linear border-black dark:border-white dark:placeholder-slate-300" type="password" autocomplete="new-password" placeholder="New Password">
                </div>
            </div>

        </div>
    </form>
</template>

<script setup>
const oldPassword = ref(undefined),
    newPassword = ref(undefined);

// TODO: Password setup
</script>