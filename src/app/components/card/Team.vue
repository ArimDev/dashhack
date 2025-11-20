<template>
    <ClientOnly>
        <div :class="['rounded-3xl', { 'h-50': !notes && !compact, 'h-45': !notes && compact }]" :style="{ backgroundColor: team.color }">
            <div :class="notes ? 'max-h-50 h-50 rounded-tr-3xl' : 'h-full rounded-r-3xl'" class="shadow-md bg-white text-black dark:bg-gray-800 dark:text-white ml-5 font-bold text-2xl px-[2%] flex transition-colors duration-500">
                <div :class="compact ? 'w-[100%]' : 'w-[30%]'" class="py-[3%]">
                    <div class="flex flex-row items-center gap-3 mb-2">
                        <h1 class="text-3xl font-bold">{{ team.name }}</h1>
                        <div class="flex flex-row items-center gap-1 z-[1]">
                            <button @click="emit('edit', team)" class="cursor-pointer flex flex-row items-center transition-transform duration-300 ease-in-out hover:scale-120">
                                <Icon name="heroicons:pencil-square-20-solid" size="25px" :style="{ color: team.color }" />
                            </button>
                            <button @click="emit('delete', team)" class="cursor-pointer flex flex-row items-center transition-transform duration-300 ease-in-out hover:scale-120">
                                <Icon name="heroicons:trash" size="24px" :style="{ color: team.color }" style="margin-bottom: 2px;" />
                            </button>
                        </div>
                    </div>
                    <MDC class="text-base font-normal w-full break-words max-h-[132px] h-[132px] overflow-hidden" :value="team.description" />
                </div>
                <div v-show="!compact" class="w-[70%] h-full flex items-center justify-center">
                    <div v-if="chartLoading" class="w-full h-full flex text-center justify-center items-center">
                        <p class="text-xs font-normal italic">Loading chart...</p>
                    </div>
                    <ClientOnly v-else-if="!!team.github && !!chartDisplay">
                        <div class="w-full h-full pt-8 pb-1 px-1">
                            <apexchart height="100%" width="100%" type="area" :options="{
                                ...chartOptions,
                                colors: [team.color],
                                chart: {
                                    ...chartOptions.chart,
                                    height: '100%',
                                    width: '100%',
                                    parentHeightOffset: 0
                                },
                                plotOptions: {
                                    ...chartOptions.plotOptions
                                },
                                grid: {
                                    ...chartOptions?.grid,
                                    padding: {
                                        top: 5,
                                        right: 5,
                                        bottom: 5,
                                        left: 5
                                    }
                                }
                            }" :series="series">
                            </apexchart>
                        </div>
                    </ClientOnly>
                    <div v-else class="w-full h-full flex text-center justify-center items-center">
                        <p v-if="!team.github" class="text-xs font-normal italic">Include GitHub URL to see activity chart.</p>
                        <p v-else-if="!chartDisplay" class="text-xs font-normal italic">{{ chartReason }}</p>
                    </div>
                </div>
            </div>
            <div v-show="notes" class="rounded-br-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white min-h-[theme(spacing.25)] ml-5 font-normal text-lg px-[2%] py-4 transition-colors duration-500">
                <div class="h-full" style="position: relative; top: -40px;">
                    <h2 class="text-xl font-bold">Notes:</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <StickyNote
                            v-for="note in team.stickyNotes || []"
                            :key="note.id"
                            :note="note"
                            @update="note => $emit('update-note', { teamName: team.name, note })"
                            @delete="noteId => $emit('delete-note', { teamName: team.name, noteId })"
                        />
                        <button 
                            @click="emit('add-note', team.name)" 
                            class="h-32 p-3 rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-bluey-500 dark:hover:text-bluey-400 hover:border-bluey-500 dark:hover:border-bluey-400 transition-colors duration-200"
                            title="Add new note"
                        >
                            <Icon name="heroicons:plus-20-solid" size="40px" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </ClientOnly>
</template>

<script setup>
const { showToast } = useToast();
const emit = defineEmits(["edit", "delete", "add-note", "update-note", "delete-note"]);
const props = defineProps({
    team: Object,
    notes: Boolean,
    compact: Boolean,
});
const route = useRoute();
const eventName = ref(route.params.event);

const series = ref(null),
    chartOptions = ref(null),
    chartLoading = ref(true),
    chartDisplay = ref(false),
    chartReason = ref("Unknown error!");

const { getSeries } = useGithubSeries(eventName.value);

onMounted(async () => {
    if (props.team.github) {
        const event = (await $fetch(`/api/event/${eventName.value}`)).data;

        if (!event?.settings?.githubToken) {
            showToast("Failed contact GitHub API!", "GitHub Token is missing to fetch charts.");
            return chartDisplay.value = false,
                chartLoading.value = false,
                chartReason.value = "GitHub Token is missing!";
        } else {
            const res = await getSeries(props.team.github);
            if (res.status !== 200) {
                return chartDisplay.value = false,
                    chartLoading.value = false,
                    chartReason.value = res.message;
            }

            //Reverse the data to show the oldest data on the left side
            const commitData = res.commits.slice().reverse();
            const diffData = res.diff.slice().reverse();
            const hours = res.hours.slice().reverse();

            series.value = [
                {
                    name: "Commits",
                    type: "line",
                    data: commitData,
                },
                {
                    name: "Lines",
                    type: "area",
                    data: diffData,
                },
            ];

            chartOptions.value = {
                colors: [props.team.color],
                chart: {
                    zoom: { enabled: true },
                    toolbar: {
                        show: true,
                        offsetX: 0,
                        offsetY: 0,
                        tools: {
                            download: false,
                            selection: true,
                            zoom: `<span class="z-1 relative iconify i-heroicons:arrows-pointing-out-16-solid" aria-hidden="true" style="font-size: 30px; color: ${props.team.color};"></span>`,
                            zoomin: `<span class="z-1 relative iconify i-heroicons:magnifying-glass-plus-16-solid" aria-hidden="true" style="font-size: 30px; color: ${props.team.color};"></span>`,
                            zoomout: `<span class="z-1 relative iconify i-heroicons:magnifying-glass-minus-16-solid" aria-hidden="true" style="font-size: 30px; color: ${props.team.color};"></span>`,
                            pan: `<span class="z-1 relative iconify i-heroicons:hand-raised-16-solid" aria-hidden="true" style="font-size: 30px; color: ${props.team.color};"></span>`,
                            reset: `<span class="z-1 relative iconify i-heroicons:arrow-path-16-solid" aria-hidden="true" style="font-size: 30px; color: ${props.team.color};"></span>`,
                        },
                        style: {
                            z: 1,
                        },
                    }
                },
                dataLabels: {
                    enabled: false,
                },
                xaxis: {
                    categories: hours,
                },
                legend: {
                    show: false,
                },
                tooltip: {
                    enabled: true,
                }
            };

            return chartDisplay.value = true,
                chartLoading.value = false;
        }
    } else return chartDisplay.value = false,
        chartLoading.value = false;
});
</script>

<style>
p a {
    color: var(--color-bluey-500);
    text-decoration: underline;
}

.apexcharts-selected * {
    color: #3081e0 !important;
    background-color: #3081e0 !important;
    stroke: #3081e0 !important;
}

.apexcharts-menu-icon,
.apexcharts-pan-icon,
.apexcharts-reset-icon,
.apexcharts-selection-icon,
.apexcharts-toolbar-custom-icon,
.apexcharts-zoom-icon,
.apexcharts-zoomin-icon,
.apexcharts-zoomout-icon {
    transform: scale(1) !important;
    margin-top: -10px !important;
    width: 30px !important;
    height: 30px !important;
}
</style>