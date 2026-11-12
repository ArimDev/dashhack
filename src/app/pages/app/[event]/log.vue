<script setup>
definePageMeta({middleware:['routes']});
const route=useRoute();
await navigateTo({path:`/app/${encodeURIComponent(route.params.event)}/history`,query:route.query,hash:route.hash},{replace:true});
</script>
<template><div /></template>