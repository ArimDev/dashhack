<template>
    <div class="rounded-3xl h-50 overflow-auto max-h-50" :style="{ backgroundColor: team.color }">
        <div class="shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-full ml-5 font-bold text-2xl px-[2%] py-[3%] flex transition-colors duration-500">
            <div class="w-[50%]">
                <div class="flex flex-row items-center gap-3 mb-2">
                    <h1 class="text-3xl font-bold">{{ team.name }}</h1>
                    <div class="flex flex-row items-center gap-1">
                        <button @click="emit('edit', team)" class="cursor-pointer flex flex-row items-center transition-transform duration-300 ease-in-out hover:scale-120">
                            <Icon name="heroicons:pencil-square-20-solid" size="25px" :style="{ color: team.color }" />
                        </button>
                        <button @click="emit('delete', team)" class="cursor-pointer flex flex-row items-center transition-transform duration-300 ease-in-out hover:scale-120">
                            <Icon name="heroicons:trash" size="24px" :style="{ color: team.color }" style="margin-bottom: 2px;" />
                        </button>
                    </div>
                </div>
                <p class="text-sm font-normal">{{ team.description }}</p>
            </div>
            <div>

            </div>
        </div>
    </div>
</template>

<script setup>
const emit = defineEmits(["edit", "delete"]);
const props = defineProps({
    team: Object,
});
</script>