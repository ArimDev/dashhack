const toasts = ref([]);
let idCounter = 0;

export const useToast = () => {
	return {
		toasts,
		showToast: (title, message, duration = 5000) => {
			const id = idCounter++;

			toasts.value.push({ id, title, message, visible: true });

			setTimeout(() => {
				const index = toasts.value.findIndex(t => t.id === id);
				if (index !== -1) {
					toasts.value[index].visible = false;

					setTimeout(() => {
						const removeIndex = toasts.value.findIndex(t => t.id === id);
						if (removeIndex !== -1) {
							toasts.value.splice(removeIndex, 1);
						}
					}, 300);
				}
			}, duration);
		}
	};
};