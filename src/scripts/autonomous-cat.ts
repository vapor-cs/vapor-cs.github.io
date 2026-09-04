const catSelector = '[data-autonomous-cat]';
const contentSelector = [
	'.directory a',
	'.page-view h1',
	'.page-view h2',
	'.page-view p',
	'.page-view li',
	'.page-view time',
	'.page-view a',
	'.page-view img',
].join(', ');

type CatState = 'idle' | 'walking' | 'cleaning' | 'avoiding';

let activeCat: HTMLElement | null = null;
let cleanupCat: (() => void) | undefined;

const setupCat = () => {
	const cat = document.querySelector<HTMLElement>(catSelector);
	if (!cat || cat === activeCat) return;

	cleanupCat?.();
	const sprite = cat.querySelector<HTMLElement>('.cat-sprite');
	if (!sprite) return;
	activeCat = cat;

	let x = Math.max(16, window.innerWidth - cat.offsetWidth - 32);
	let velocityX = 0;
	let targetX: number | null = null;
	let state: CatState = 'idle';
	let facingDirection = 1;
	let previousTime = performance.now();
	let nextActionTime = previousTime + 3_500 + Math.random() * 2_500;
	let actionEndsAt = 0;
	let currentFrame = -1;
	let animationFrame = 0;
	let overlapFrame = 0;

	const setFrame = (frame: number) => {
		if (frame === currentFrame) return;
		currentFrame = frame;
		const column = frame % 5;
		const row = Math.floor(frame / 5);
		sprite.style.backgroundPosition = `${column * 25}% ${row * (100 / 3)}%`;
	};

	const render = () => {
		const y = Math.max(0, window.innerHeight - cat.offsetHeight);
		cat.style.transform = `translate3d(${x}px, ${y}px, 0)`;
	};

	const scheduleNextAction = (currentTime: number) => {
		nextActionTime = currentTime + 4_500 + Math.random() * 5_500;
	};

	const beginWalk = (currentTime: number, destination?: number, avoiding = false) => {
		const margin = 16;
		const maxX = Math.max(margin, window.innerWidth - cat.offsetWidth - margin);
		if (destination === undefined) {
			const direction = Math.random() < 0.5 ? -1 : 1;
			const distance = 90 + Math.random() * 130;
			destination = Math.min(Math.max(margin, x + direction * distance), maxX);
			if (Math.abs(destination - x) < 28) {
				destination = Math.min(Math.max(margin, x - direction * distance), maxX);
			}
		}

		if (Math.abs(destination - x) < 8) {
			state = 'idle';
			targetX = null;
			scheduleNextAction(currentTime);
			return;
		}

		targetX = destination;
		state = avoiding ? 'avoiding' : 'walking';
		facingDirection = Math.sign(destination - x) || facingDirection;
	};

	const beginCleaning = (currentTime: number) => {
		state = 'cleaning';
		targetX = null;
		velocityX = 0;
		actionEndsAt = currentTime + 3_200;
	};

	const overlapArea = (first: DOMRect, second: DOMRect) => {
		const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
		const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
		return width * height;
	};

	const avoidContentOverlap = () => {
		overlapFrame = 0;
		if (getComputedStyle(cat).display === 'none') return;
		const catBounds = cat.getBoundingClientRect();
		const contentBounds = [...document.querySelectorAll<HTMLElement>(contentSelector)]
			.map((element) => element.getBoundingClientRect())
			.filter((bounds) => bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight);
		if (!contentBounds.some((bounds) => overlapArea(catBounds, bounds) > 0)) return;

		const directory = document.querySelector<HTMLElement>('.directory');
		if (!directory) return;
		const bounds = directory.getBoundingClientRect();
		const maxX = Math.max(0, window.innerWidth - cat.offsetWidth);
		const destination = Math.min(Math.max(0, bounds.left + bounds.width / 2 - cat.offsetWidth / 2), maxX);
		beginWalk(performance.now(), destination, true);
	};

	const scheduleOverlapCheck = () => {
		if (overlapFrame) return;
		overlapFrame = requestAnimationFrame(avoidContentOverlap);
	};

	const updateAnimation = (currentTime: number) => {
		if (state === 'walking' || state === 'avoiding') {
			const frame = Math.floor((currentTime / 1000) * 8) % 5;
			setFrame(facingDirection > 0 ? frame : frame + 5);
		} else if (state === 'cleaning') {
			const cleaningFrames = [15, 16, 17, 18, 19, 18, 17, 16];
			const index = Math.floor((currentTime / 1000) * 6) % cleaningFrames.length;
			setFrame(cleaningFrames[index]);
		} else {
			const idleFrames = [10, 10, 10, 11, 10, 12, 10, 13, 10, 14];
			const index = Math.floor((currentTime / 1000) * 2) % idleFrames.length;
			setFrame(idleFrames[index]);
		}
	};

	const update = (currentTime: number) => {
		const elapsed = Math.min((currentTime - previousTime) / 1000, 0.032);
		previousTime = currentTime;

		if (state === 'cleaning' && currentTime >= actionEndsAt) {
			state = 'idle';
			scheduleNextAction(currentTime);
		} else if (state === 'idle' && currentTime >= nextActionTime) {
			if (Math.random() < 0.35) beginCleaning(currentTime);
			else beginWalk(currentTime);
		}

		if ((state === 'walking' || state === 'avoiding') && targetX !== null) {
			const distance = targetX - x;
			const desiredVelocity = Math.max(-165, Math.min(165, distance * 4));
			const difference = desiredVelocity - velocityX;
			const acceleration = 950;
			velocityX += Math.sign(difference) * Math.min(Math.abs(difference), acceleration * elapsed);
			x += velocityX * elapsed;

			if (Math.abs(distance) < 1 && Math.abs(velocityX) < 7) {
				x = targetX;
				velocityX = 0;
				targetX = null;
				state = 'idle';
				scheduleNextAction(currentTime);
			}
		}

		const maxX = Math.max(0, window.innerWidth - cat.offsetWidth);
		x = Math.min(Math.max(0, x), maxX);
		updateAnimation(currentTime);
		render();
		animationFrame = requestAnimationFrame(update);
	};

	const onResize = () => {
		x = Math.min(Math.max(0, x), Math.max(0, window.innerWidth - cat.offsetWidth));
		render();
		scheduleOverlapCheck();
	};
	const onPageLoad = () => {
		state = 'idle';
		targetX = null;
		velocityX = 0;
		scheduleNextAction(performance.now());
		scheduleOverlapCheck();
	};

	setFrame(10);
	render();
	window.addEventListener('resize', onResize);
	window.addEventListener('scroll', scheduleOverlapCheck, { passive: true });
	document.addEventListener('astro:page-load', onPageLoad);
	scheduleOverlapCheck();
	animationFrame = requestAnimationFrame(update);

	cleanupCat = () => {
		cancelAnimationFrame(animationFrame);
		cancelAnimationFrame(overlapFrame);
		window.removeEventListener('resize', onResize);
		window.removeEventListener('scroll', scheduleOverlapCheck);
		document.removeEventListener('astro:page-load', onPageLoad);
		activeCat = null;
	};
};

setupCat();
document.addEventListener('astro:page-load', setupCat);
