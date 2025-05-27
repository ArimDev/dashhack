<template>
    <ClientOnly>
    <div :class="['max-h-100 rounded-3xl', { 'h-75': notes, 'h-50': !notes }]" :style="{ backgroundColor: team.color }">
        <div :class="[{ 'max-h-50 h-50 rounded-tr-3xl': notes, 'h-full rounded-r-3xl': !notes }]" class="shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-full ml-5 font-bold text-2xl px-[2%] flex transition-colors duration-500">
            <div class="w-[30%] py-[3%]">
                <div class="flex flex-row items-center gap-3 mb-2">
                    <h1 class="text-3xl font-bold">{{ team.name }}</h1>
                    <div class="flex flex-row items-center gap-1 z-1">
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
            <div class="w-[70%] h-full flex items-center justify-center">
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
                                ...chartOptions.grid,
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
                    <p v-else-if="!chartDisplay" class="text-xs font-normal italic">Invalid GitHub token.</p>
                </div>
            </div>
        </div>
        <div v-if="notes" class="rounded-br-3xl shadow-md bg-white text-black dark:bg-gray-800 dark:text-white h-25 ml-5 font-normal text-lg px-[2%] transition-colors duration-500">
            <div class="h-full" style="position: relative; top: -40px;">
                <h2 class="text-xl font-bold">Notes:</h2>
                <MDC class="text-sm font-normal w-full break-words h-full bg-zinc-300 rounded-2xl p-2" :value="team.notes" />
            </div>
        </div>
    </div>
    </ClientOnly>
</template>

<script setup>
const { showToast } = useToast();
const emit = defineEmits(["edit", "delete"]);
const props = defineProps({
    team: Object,
    notes: Boolean
});
const route = useRoute();
const eventName = ref(route.params.event);

const series = ref(null),
    chartOptions = ref(null),
    chartLoading = ref(true),
    chartDisplay = ref(false);

onMounted(async () => {
    if (props.team.github) {
        const event = (await $fetch(`/api/event/${eventName.value}`)).data;

        if (!event?.settings?.githubToken) {
            showToast("Failed contact GitHub API!", "GitHub Token is missing to fetch charts.");
            return chartDisplay.value = false,
                chartLoading.value = false;
        } else {
            const res = await $fetch(`/api/github/series?url=${encodeURIComponent(props.team.github)}&event=${encodeURIComponent(eventName.value)}`);
            if (res.status !== 200) {
                console.log("x");
                return chartDisplay.value = false,
                    chartLoading.value = false;
            }

            const commitData = res.commits;
            const diffData = res.diff;

            // 24 element array with times (11:00, 12:00, ...)
            const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

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
                        }
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