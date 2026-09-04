let activeDirectory: HTMLElement | null = null;
let removeDirectoryListeners: (() => void) | undefined;

const setupMobileDirectory = () => {
	const directory = document.querySelector<HTMLElement>('[data-mobile-directory]');
	if (!directory || directory === activeDirectory) return;

	removeDirectoryListeners?.();
	const toggle = directory.querySelector<HTMLButtonElement>('.directory-toggle');
	if (!toggle) return;
	activeDirectory = directory;

	const setExpanded = (expanded: boolean) => {
		directory.classList.toggle('is-expanded', expanded);
		toggle.setAttribute('aria-expanded', String(expanded));
		toggle.setAttribute('aria-label', expanded ? 'hide directory' : 'show directory');
	};

	const onToggle = () => setExpanded(!directory.classList.contains('is-expanded'));
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && directory.classList.contains('is-expanded')) {
			setExpanded(false);
			toggle.focus();
		}
	};

	toggle.addEventListener('click', onToggle);
	document.addEventListener('keydown', onKeyDown);

	removeDirectoryListeners = () => {
		toggle.removeEventListener('click', onToggle);
		document.removeEventListener('keydown', onKeyDown);
		activeDirectory = null;
	};
};

setupMobileDirectory();
document.addEventListener('astro:page-load', setupMobileDirectory);
