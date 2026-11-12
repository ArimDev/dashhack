<template>
    <div class="dashboard-identity min-w-0" :class="collapsed ? 'px-2 pb-3 pt-1' : 'px-3 pb-3 pt-1'">
        <NuxtLink to="/" aria-label="DashHack home" :title="eventName" class="flex min-h-11 items-center gap-2" :class="collapsed ? 'justify-center' : 'px-2'">
            <img :src="'/logo.png'" alt="" class="h-6 w-6 shrink-0" /><span v-if="!collapsed" class="text-base font-bold">DashHack</span>
        </NuxtLink>
        <p v-if="!collapsed" class="mt-1 rounded-lg bg-gray-50 px-2 py-2 text-sm font-semibold leading-snug break-words text-gray-800 dark:bg-gray-900/40 dark:text-gray-100">{{ eventName }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-1" :class="collapsed ? 'flex-col' : 'justify-between'">
            <div v-if="loggedIn" title="Shared event login" class="flex min-h-9 items-center gap-1.5 px-2 text-xs font-medium text-bluey-700 dark:text-bluey-200">
                <Icon name="heroicons:key" size="16px" /><span :class="{ 'sr-only': collapsed }">Editing</span>
            </div>
            <button v-else type="button" aria-label="Log in to edit" title="Log in to edit" class="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-bluey-700 hover:bg-bluey-50 dark:text-bluey-200 dark:hover:bg-gray-700" @click="$emit('login')">
                <Icon name="heroicons:lock-closed" size="18px" /><span v-if="!collapsed">Log in</span>
            </button>
        <div class="flex items-center gap-0.5" :class="{ 'flex-col': collapsed }">
            <button type="button" class="icon-button text-gray-600 dark:text-gray-300" :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'" :title="dark ? 'Light mode' : 'Dark mode'" @click="$emit('theme')"><Icon :name="dark ? 'heroicons:sun' : 'heroicons:moon'" size="20px" /></button>
            <a v-if="discordInvite" :href="discordInvite" target="_blank" rel="noopener noreferrer" aria-label="Event Discord" title="Event Discord" class="icon-button text-gray-600 dark:text-gray-300"><Icon name="akar-icons:discord-fill" size="20px" /></a>
            <button type="button" class="icon-button text-gray-600 dark:text-gray-300" aria-label="Leave event" title="Leave event" @click="$emit('leave')"><Icon name="heroicons:arrow-left-on-rectangle" size="20px" /></button>
        </div>
        </div>
        <p v-if="showQuota" class="mt-2 flex items-center gap-2 border-t border-gray-100 px-1 pt-2 text-xs leading-relaxed text-gray-600 dark:border-gray-700 dark:text-gray-300" :class="collapsed ? 'justify-center' : 'justify-between'" :title="quotaLabel" :aria-label="`GitHub: ${quotaLabel}`">
            <span :class="{ 'sr-only': collapsed }">GitHub</span><span class="whitespace-nowrap tabular-nums">{{ quota.loading ? '…' : quota.error ? collapsed ? '—' : 'Unavailable' : collapsed ? quota.remaining : `${quota.remaining} / ${quota.limit}` }}</span>
        </p>
    </div>
</template>
<script setup>
const props = defineProps({eventName:String, collapsed:Boolean, loggedIn:Boolean, dark:Boolean, discordInvite:String, showQuota:Boolean, quota:{type:Object,required:true}});
defineEmits(['login','leave','theme']);
const quotaLabel = computed(() => props.quota.loading ? 'Loading quota…' : props.quota.error ? 'Quota unavailable' : `${props.quota.remaining} / ${props.quota.limit} requests left`);
</script>
