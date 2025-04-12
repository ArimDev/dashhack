const show = ref(false);
const title = ref("")
const message = ref("");

export const showToast = () => {
	return {
		show,
        title,
		message,
		visibleToast: (heading, msg, duration = 5000) => {
            title.value = heading;
			message.value = msg;
			show.value = true;
			setTimeout(() => (show.value = false), duration);
		},
		hiddenToast: () => (show.value = false),
	};
};
