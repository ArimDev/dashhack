<template>
	<div v-show="display" :class="[animationClass, 'min-w-50 min-h-22 rounded-3xl bg-white text-black dark:bg-gray-800 dark:text-white p-4 shadow-lg flex items-center']">
		<div>
			<h1 class="font-bold">{{ title }}</h1>
			<p>{{ message }}</p>
		</div>
	</div>
</template>

<script setup>
const props = defineProps({
	title: {
		type: String,
		default: "Warning"
	},
	message: {
		type: String,
		default: "Be aware!"
	},
	visible: {
		type: Boolean,
		default: false
	},
	duration: {
		type: Number,
		default: 5000
	}
});

const display = ref(props.visible);
const animationClass = ref("toastIn");

watch(() => props.visible, (newValue) => {
	if (newValue) {
		display.value = true;
		animationClass.value = "toastIn";
	} else {
		animationClass.value = "toastOut";

		setTimeout(() => {
			display.value = false;
		}, 300);
	}
}, { immediate: true });
</script>

<style scoped>
@keyframes toast-in {
	0% {
		opacity: 0;
		transform: scale(0.95) translateY(20px);
	}

	100% {
		opacity: 1;
		transform: scale(1) translateY(0);
	}
}

@keyframes toast-out {
	0% {
		opacity: 1;
		transform: scale(1) translateY(0);
	}

	100% {
		opacity: 0;
		transform: scale(0.95) translateY(20px);
	}
}

.toastIn {
	animation: toast-in 0.3s ease-out forwards;
}

.toastOut {
	animation: toast-out 0.3s ease-in forwards;
}
</style>