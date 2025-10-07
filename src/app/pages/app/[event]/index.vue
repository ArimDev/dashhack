<script setup>
const currentEvent = useState('currentEvent'),
    config = useRuntimeConfig();

definePageMeta({
    layout: 'dashboard',
    middleware: ["routes"],
});

defineOgImageComponent('NuxtSeo', {
    title: currentEvent.value,
    theme: config.public.color,
    colorMode: 'dark',
});
</script>
