<template>
    <ClientOnly>
        <div :data-testid="`team-card-${team.name}`" class="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800 border-l-[6px]" :style="{ borderLeftColor: team.color }">
            
            <div class="px-4 py-3 flex items-center justify-between bg-white dark:bg-gray-800">
                <div class="flex flex-col min-w-0 mr-4">
                    <h1 class="text-lg font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">{{ team.name }}</h1>
                    <p v-if="!showGraph && !showNotes" class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{{ team.description || 'No description provided.' }}</p>
                </div>

                <div class="flex items-center gap-1 flex-shrink-0">
                    <button 
                        data-testid="toggle-graph-btn"
                        @click="toggleGraph" 
                        class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400"
                        :class="{ 'text-bluey-500 bg-bluey-50 dark:bg-bluey-900/30': showGraph }"
                        title="Activity"
                    >
                        <Icon name="heroicons:presentation-chart-line" size="18px" />
                    </button>

                    <button 
                        data-testid="toggle-notes-btn"
                        @click="toggleNotes" 
                        class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400"
                        :class="{ 'text-bluey-500 bg-bluey-50 dark:bg-bluey-900/30': showNotes }"
                        title="Notes"
                    >
                        <Icon name="heroicons:document-text" size="18px" />
                    </button>

                    <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    <button @click="emit('edit', team)" class="p-1.5 text-gray-400 hover:text-bluey-500 transition-colors">
                        <Icon name="heroicons:pencil-square" size="16px" />
                    </button>

                    <button @click="emit('delete', team)" class="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Icon name="heroicons:trash" size="16px" />
                    </button>
                </div>
            </div>

            <div v-if="showGraph" class="border-t border-gray-100 dark:border-gray-700/50 p-2 bg-gray-50 dark:bg-gray-900/30">
                 <div class="h-48 w-full flex items-center justify-center">
                    <div v-if="chartLoading" class="text-center text-gray-400 text-xs italic flex flex-col items-center gap-2">
                        <Icon name="heroicons:arrow-path" class="animate-spin" size="16px"/>
                        <span>Loading Data...</span>
                    </div>
                    <ClientOnly v-else-if="!!team.github && !!chartDisplay">
                        <div class="w-full h-full">
                            <apexchart height="100%" width="100%" type="area" :options="{
                                ...chartOptions,
                                colors: [team.color],
                                chart: {
                                    ...chartOptions.chart,
                                    height: '100%',
                                    width: '100%',
                                    background: 'transparent',
                                    fontFamily: 'inherit'
                                },
                                grid: { padding: { top: 0, right: 0, bottom: 0, left: 5 } }
                            }" :series="series">
                            </apexchart>
                        </div>
                    </ClientOnly>
                    <div v-else class="text-center text-gray-400 text-xs italic">
                        <p>{{ chartReason || 'No data available' }}</p>
                    </div>
                </div>
            </div>

            <div v-if="showNotes" class="border-t border-gray-100 dark:border-gray-700/50 p-4 bg-gray-50 dark:bg-gray-900/50">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 grid-flow-dense">
                    <StickyNote
                        v-for="note in team.stickyNotes || []"
                        :key="note.id"
                        :note="note"
                        :class="{ 'md:col-span-2': note.content && note.content.length > 100, 'row-span-2': note.content && note.content.length > 200 }" 
                        @update="note => $emit('update-note', { teamName: team.name, note })"
                        @delete="noteId => $emit('delete-note', { teamName: team.name, noteId })"
                    />
                    
                    <button 
                        data-testid="add-note-btn"
                        @click="emit('add-note', team.name)" 
                        class="h-full min-h-[140px] rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 hover:text-bluey-500 dark:hover:text-bluey-400 hover:border-bluey-400 dark:hover:border-bluey-500 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 group"
                        title="Add new note"
                    >
                        <Icon name="heroicons:plus" size="24px" class="group-hover:scale-110 transition-transform mb-1" />
                        <span class="text-xs font-medium">New Note</span>
                    </button>
                </div>
            </div>

        </div>
    </ClientOnly>
</template>

<script setup>
const emit = defineEmits(["edit", "delete", "add-note", "update-note", "delete-note"]);
const props = defineProps({
    team: Object,
});

const showGraph = ref(false);
const showNotes = ref(false);
const route = useRoute();
const eventName = ref(route.params.event);
const { getSeries } = useGithubSeries(eventName.value);

const series = ref(null);
const chartOptions = ref(null);
const chartLoading = ref(false);
const chartDisplay = ref(false);
const chartLoadedOnce = ref(false);
const chartReason = ref("");

function toggleNotes() {
    showNotes.value = !showNotes.value;
}

async function toggleGraph() {
    showGraph.value = !showGraph.value;
    if (showGraph.value && !chartLoadedOnce.value) {
        await loadChartData();
    }
}

async function loadChartData() {
    if (!props.team.github) {
        chartReason.value = "No GitHub URL";
        return;
    }
    
    chartLoading.value = true;
    
    try {
        const res = await getSeries(props.team.github);
        if (res.status !== 200) {
            chartDisplay.value = false;
            chartReason.value = res.message || "Failed to fetch data";
        } else {
            const commitData = res.commits.slice().reverse();
            const diffData = res.diff.slice().reverse();
            const hours = res.hours.slice().reverse();

            series.value = [
                { name: "Commits", type: "line", data: commitData },
                { name: "Lines", type: "area", data: diffData },
            ];

            chartOptions.value = {
                colors: [props.team.color],
                chart: {
                    zoom: { enabled: false },
                    toolbar: { show: false },
                    fontFamily: 'inherit'
                },
                stroke: { curve: 'smooth', width: 2 },
                dataLabels: { enabled: false },
                xaxis: { 
                    categories: hours,
                    labels: { show: false },
                    axisBorder: { show: false },
                    axisTicks: { show: false }
                },
                yaxis: { show: false },
                legend: { show: true, position: 'top', fontSize: '12px' },
                tooltip: { theme: 'dark' },
                grid: { show: false }
            };

            chartDisplay.value = true;
            chartLoadedOnce.value = true;
        }
    } catch (e) {
        console.error(e);
        chartDisplay.value = false;
        chartReason.value = "Network error";
    } finally {
        chartLoading.value = false;
    }
}
</script>

<style>
.apexcharts-tooltip {
    background: #1f2937 !important;
    border-color: #374151 !important;
    color: #fff;
}
.apexcharts-tooltip-title {
    background: #111827 !important;
    border-bottom: 1px solid #374151 !important;
}
.apexcharts-menu-icon,
.apexcharts-reset-icon {
    transform: scale(1) !important;
}
</style>