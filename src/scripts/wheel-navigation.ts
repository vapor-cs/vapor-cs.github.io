import { navigate } from 'astro:transitions/client';

const routes = ['/', '/certifications', '/blog', '/resume'];
const gestureThreshold = 80;
const gestureResetDelay = 350;

let accumulatedDelta = 0;
let lastWheelTime = 0;
let navigationDirection = 0;
let navigationLocked = false;
let unlockTimer: number | undefined;

const normalizedPath = () => {
	const path = window.location.pathname.replace(/\/$/, '');
	return path || '/';
};

const atPageEdge = (direction: number) => {
	if (direction < 0) return window.scrollY <= 1;

	const scrollBottom = window.scrollY + window.innerHeight;
	return scrollBottom >= document.documentElement.scrollHeight - 1;
};

window.addEventListener(
	'wheel',
	(event) => {
		if (navigationLocked) {
			event.preventDefault();
			return;
		}

		if (event.ctrlKey || Math.abs(event.deltaY) < 2) return;

		const direction = Math.sign(event.deltaY);
		if (!atPageEdge(direction)) {
			accumulatedDelta = 0;
			return;
		}

		const now = performance.now();
		if (now - lastWheelTime > gestureResetDelay || Math.sign(accumulatedDelta) !== direction) {
			accumulatedDelta = 0;
		}

		lastWheelTime = now;
		accumulatedDelta += event.deltaY;
		if (Math.abs(accumulatedDelta) < gestureThreshold) return;

		const currentPath = normalizedPath();
		const readingBlogPost = currentPath.startsWith('/blog/');
		const currentIndex = routes.indexOf(currentPath);
		const nextRoute = readingBlogPost ? '/blog' : routes[currentIndex + direction];
		accumulatedDelta = 0;

		if (!nextRoute) return;

		event.preventDefault();
		navigationLocked = true;
		navigationDirection = readingBlogPost ? 1 : direction;
		window.clearTimeout(unlockTimer);
		unlockTimer = window.setTimeout(() => {
			navigationLocked = false;
		}, 1500);
		navigate(nextRoute);
	},
	{ passive: false },
);

document.addEventListener('astro:page-load', () => {
	const completedDirection = navigationDirection;
	navigationDirection = 0;

	if (completedDirection < 0) {
		window.scrollTo(0, document.documentElement.scrollHeight);
	} else if (completedDirection > 0) {
		window.scrollTo(0, 0);
	}

	window.clearTimeout(unlockTimer);
	unlockTimer = window.setTimeout(() => {
		navigationLocked = false;
	}, 450);
	accumulatedDelta = 0;
});
