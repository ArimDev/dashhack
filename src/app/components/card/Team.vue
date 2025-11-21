<template>
    <ClientOnly>
        <div :data-testid="`team-card-${team.name}`" class="rounded-2xl overflow-hidden shadow-lg transition-all duration-300 bg-white dark:bg-gray-800 border-l-8" :style="{ borderLeftColor: team.color }">
            
            <div class="p-4 flex items-center justify-between bg-white dark:bg-gray-800">
                <div class="flex flex-col">
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ team.name }}</h1>
                    <p v-if="!showGraph && !showNotes" class="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">{{ team.description }}</p>
                </div>

                <div class="flex items-center gap-2">
                    <button 
                        data-testid="toggle-graph-btn"
                        @click="toggleGraph" 
                        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        :class="{ 'text-bluey-500 bg-bluey-50 dark:bg-bluey-900/30': showGraph, 'text-gray-400': !showGraph }"
                        title="Toggle Activity Graph"
                    >
                        <Icon name="heroicons:presentation-chart-line" size="24px" />
                    </button>

                    <button 
                        data-testid="toggle-notes-btn"
                        @click="toggleNotes" 
                        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        :class="{ 'text-bluey-500 bg-bluey-50 dark:bg-bluey-900/30': showNotes, 'text-gray-400': !showNotes }"
                        title="Toggle Sticky Notes"
                    >
                        <Icon name="heroicons:document-text" size="24px" />
                    </button>

                    <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

                    <button @click="emit('edit', team)" class="p-2 text-gray-500 hover:text-bluey-500 transition-colors">
                        <Icon name="heroicons:pencil-square-20-solid" size="20px" />
                    </button>

                    <button @click="emit('delete', team)" class="p-2 text-gray-500 hover:text-red-500 transition-colors">
                        <Icon name="heroicons:trash" size="20px" />
                    </button>
                </div>
            </div>

            <div v-if="showGraph" class="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                 <div class="h-64 w-full flex items-center justify-center">
                    <div v-if="chartLoading" class="text-center text-gray-500 italic flex flex-col items-center gap-2">
                        <Icon name="heroicons:arrow-path" class="animate-spin" size="24px"/>
                        <span>Loading GitHub Data...</span>
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
                                    background: 'transparent'
                                },
                                grid: { padding: { top: 0, right: 0, bottom: 0, left: 10 } }
                            }" :series="series">
                            </apexchart>
                        </div>
                    </ClientOnly>
                    <div v-else class="text-center text-gray-500 italic">
                        <p v-if="!team.github">No GitHub URL provided.</p>
                        <p v-else>Unable to load chart data: {{ chartReason }}</p>
                    </div>
                </div>
            </div>

            <div v-if="showNotes" class="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-100 dark:bg-gray-900">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Team Notes</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 grid-flow-dense">
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
                        class="h-full min-h-[160px] p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:text-bluey-500 dark:hover:text-bluey-400 hover:border-bluey-500 dark:hover:border-bluey-400 hover:bg-bluey-50/50 dark:hover:bg-bluey-900/20 transition-all duration-200 group"
                        title="Add new note"
                    >
                        <Icon name="heroicons:plus" size="32px" class="group-hover:scale-110 transition-transform" />
                        <span class="text-sm font-semibold mt-2">Add Note</span>
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

// Chart state
const series = ref(null);
const chartOptions = ref(null);
const chartLoading = ref(false);
const chartDisplay = ref(false);
const chartLoadedOnce = ref(false);
const chartReason = ref("Unknown error");

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
    if (!props.team.github) return;
    
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
                legend: { show: true, position: 'top' },
                tooltip: { theme: 'dark' },
                grid: { show: false }
            };

            chartDisplay.value = true;
            chartLoadedOnce.value = true;
        }
    } catch (e) {
        console.error(e);
        chartDisplay.value = false;
        chartReason.value = "Network or parsing error";
    } finally {
        chartLoading.value = false;
    }
}
</script>

<style>
.apexcharts-menu-icon,
.apexcharts-reset-icon {
    transform: scale(1) !important;
}
</style>