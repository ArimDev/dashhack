<script setup>
const currentEvent = useState('currentEvent'),
    config = useRuntimeConfig();

definePageMeta({
    layout: 'dashboard',
    middleware: ["routes"],
});

</script>
