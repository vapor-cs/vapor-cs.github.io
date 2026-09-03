const selector = '[data-playable-character]';
const controlledKeys = new Set(['a', 'd', 'w', 's']);
const avoidableContentSelector = [
	'.directory a',
	'.page-view h1',
	'.page-view h2',
	'.page-view p',
	'.page-view li',
	'.page-view time',
	'.page-view a',
	'.page-view img',
].join(', ');
const userInactivityDelay = 8_000;

type AutomaticMovementMode = 'avoidance' | 'wander';

let controlledCharacter: HTMLElement | null = null;
let cleanupController: (() => void) | undefined;

const setupCharacter = () => {
	const character = document.querySelector<HTMLElement>(selector);
	if (!character || character === controlledCharacter) return;

	cleanupController?.();
	const sprite = character.querySelector<HTMLElement>('.character-sprite');
	if (!sprite) return;
	controlledCharacter = character;

	const initialBounds = character.getBoundingClientRect();
	const pressedKeys = new Set<string>();
	let x = Math.max(0, (window.innerWidth - initialBounds.width) / 2);
	let y = Math.max(0, window.innerHeight - initialBounds.height);
	let velocityX = 0;
	let velocityY = 0;
	let grounded = true;
	let hasBeenControlled = false;
	let facingDirection = -1;
	let previousTime = performance.now();
	let animationFrame = 0;
	let avoidanceFrame = 0;
	let guideTimer: number | undefined;
	let currentSpriteFrame = -1;
	let automaticTargetX: number | null = null;
	let automaticMovementMode: AutomaticMovementMode | null = null;
	let guideIsHidden = character.classList.contains('guide-hidden');
	let lastUserInputTime = Number.NEGATIVE_INFINITY;
	let nextWanderTime = performance.now() + 2_500;
	let lastWanderOverlapCheck = 0;

	const hideGuide = () => {
		guideIsHidden = true;
		character.classList.add('guide-hidden');
		window.clearTimeout(guideTimer);
	};

	const setSpriteFrame = (frame: number) => {
		if (frame === currentSpriteFrame) return;
		currentSpriteFrame = frame;
		const column = frame % 5;
		const row = Math.floor(frame / 5);
		sprite.style.backgroundPosition = `${column * 25}% ${row * 50}%`;
	};

	const updateSprite = (currentTime: number) => {
		const moving = Math.abs(velocityX) > 24;
		let frames = [0];
		let framesPerSecond = 1;

		if (!grounded) {
			frames = [8, 9];
			framesPerSecond = 5;
		} else if (moving) {
			frames = [5, 6, 7];
			framesPerSecond = 9;
		}

		const frameIndex = Math.floor((currentTime / 1000) * framesPerSecond) % frames.length;
		setSpriteFrame(frames[frameIndex]);
		sprite.style.setProperty('--character-direction', facingDirection > 0 ? '-1' : '1');
	};

	const render = () => {
		character.style.transform = `translate3d(${x}px, ${y}px, 0)`;
	};

	const clampToViewport = () => {
		const maxX = Math.max(0, window.innerWidth - character.offsetWidth);
		const maxY = Math.max(0, window.innerHeight - character.offsetHeight);
		x = Math.min(Math.max(0, x), maxX);
		y = Math.min(Math.max(0, y), maxY);
		grounded = y >= maxY;
		render();
	};

	const overlapArea = (first: DOMRect, second: DOMRect) => {
		const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
		const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
		return width * height;
	};

	const avoidContentOverlap = () => {
		avoidanceFrame = 0;
		if (getComputedStyle(character).display === 'none') return;

		const spriteBounds = sprite.getBoundingClientRect();
		const contentBounds = [...document.querySelectorAll<HTMLElement>(avoidableContentSelector)]
			.map((element) => element.getBoundingClientRect())
			.filter((bounds) => bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight);
		const paddedSpriteBounds = new DOMRect(
			spriteBounds.left - 6,
			spriteBounds.top - 6,
			spriteBounds.width + 12,
			spriteBounds.height + 12,
		);
		const isOverlapping = contentBounds.some((bounds) => overlapArea(paddedSpriteBounds, bounds) > 0);
		if (!isOverlapping) return;

		const directory = document.querySelector<HTMLElement>('.directory');
		if (!directory) return;
		const directoryBounds = directory.getBoundingClientRect();
		const maxX = Math.max(0, window.innerWidth - character.offsetWidth);
		const directoryCenter = directoryBounds.left + directoryBounds.width / 2;
		automaticTargetX = Math.min(Math.max(0, directoryCenter - character.offsetWidth / 2), maxX);
		automaticMovementMode = 'avoidance';
	};

	const scheduleOverlapCheck = () => {
		if (avoidanceFrame) return;
		avoidanceFrame = requestAnimationFrame(avoidContentOverlap);
	};

	const onKeyDown = (event: KeyboardEvent) => {
		const key = event.key.toLowerCase();
		const target = event.target;
		const isEditing = target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]');
		if (isEditing || !controlledKeys.has(key)) return;

		event.preventDefault();
		automaticTargetX = null;
		automaticMovementMode = null;
		lastUserInputTime = performance.now();
		nextWanderTime = lastUserInputTime + userInactivityDelay;
		if (!hasBeenControlled) {
			hasBeenControlled = true;
			hideGuide();
		}
		pressedKeys.add(key);

		if (!event.repeat && grounded && key === 'w') {
			velocityY = -680;
			grounded = false;
		}
	};

	const onKeyUp = (event: KeyboardEvent) => {
		const key = event.key.toLowerCase();
		if (!controlledKeys.has(key)) return;
		pressedKeys.delete(key);
		lastUserInputTime = performance.now();
		nextWanderTime = lastUserInputTime + userInactivityDelay;
		event.preventDefault();
	};

	const onWindowBlur = () => {
		pressedKeys.clear();
		if (hasBeenControlled) {
			lastUserInputTime = performance.now();
			nextWanderTime = lastUserInputTime + userInactivityDelay;
		}
	};
	const onResize = () => {
		if (hasBeenControlled) {
			clampToViewport();
			scheduleOverlapCheck();
			return;
		}

		x = Math.max(0, (window.innerWidth - character.offsetWidth) / 2);
		y = Math.max(0, window.innerHeight - character.offsetHeight);
		velocityX = 0;
		velocityY = 0;
		grounded = true;
		render();
		scheduleOverlapCheck();
	};
	const onPageLoad = () => {
		automaticTargetX = null;
		automaticMovementMode = null;
		nextWanderTime = Math.max(performance.now() + 2_500, lastUserInputTime + userInactivityDelay);
		scheduleOverlapCheck();
	};

	const beginWander = (currentTime: number) => {
		if (getComputedStyle(character).display === 'none') {
			nextWanderTime = currentTime + 5_000;
			return;
		}

		const sideMargin = 16;
		const maxX = Math.max(0, window.innerWidth - character.offsetWidth);
		const direction = Math.random() < 0.5 ? -1 : 1;
		const distance = 110 + Math.random() * 120;
		let target = Math.min(Math.max(sideMargin, x + direction * distance), Math.max(sideMargin, maxX - sideMargin));

		if (Math.abs(target - x) < 24) {
			target = Math.min(Math.max(sideMargin, x - direction * distance), Math.max(sideMargin, maxX - sideMargin));
		}

		if (Math.abs(target - x) < 8) {
			nextWanderTime = currentTime + 4_000;
			return;
		}

		automaticTargetX = target;
		automaticMovementMode = 'wander';
	};

	const update = (currentTime: number) => {
		const elapsed = Math.min((currentTime - previousTime) / 1000, 0.032);
		previousTime = currentTime;

		const horizontalInput = Number(pressedKeys.has('d')) - Number(pressedKeys.has('a'));
		if (horizontalInput !== 0) {
			automaticTargetX = null;
			automaticMovementMode = null;
		}

		const userIsInactive = currentTime - lastUserInputTime >= userInactivityDelay;
		if (guideIsHidden && horizontalInput === 0 && automaticMovementMode === null && userIsInactive && currentTime >= nextWanderTime) {
			beginWander(currentTime);
		}

		let targetVelocity = horizontalInput * 310;
		if (horizontalInput !== 0) {
			facingDirection = horizontalInput;
		} else if (automaticTargetX !== null) {
			const distanceToTarget = automaticTargetX - x;
			if (Math.abs(distanceToTarget) < 1 && Math.abs(velocityX) < 8) {
				x = automaticTargetX;
				velocityX = 0;
				automaticTargetX = null;
				automaticMovementMode = null;
				nextWanderTime = currentTime + 4_000 + Math.random() * 4_000;
			} else {
				facingDirection = Math.sign(distanceToTarget) || facingDirection;
				targetVelocity = Math.max(-310, Math.min(310, distanceToTarget * 5));
			}
		}

		const acceleration = targetVelocity === 0 ? 1600 : 2050;
		const velocityDifference = targetVelocity - velocityX;
		const velocityChange = Math.sign(velocityDifference) * Math.min(Math.abs(velocityDifference), acceleration * elapsed);
		velocityX += velocityChange;

		velocityY += (pressedKeys.has('s') ? 2650 : 1750) * elapsed;
		x += velocityX * elapsed;
		y += velocityY * elapsed;

		const maxX = Math.max(0, window.innerWidth - character.offsetWidth);
		const maxY = Math.max(0, window.innerHeight - character.offsetHeight);

		if (x <= 0 && velocityX < 0) {
			x = 0;
			velocityX = Math.abs(velocityX) * 0.68;
		} else if (x >= maxX && velocityX > 0) {
			x = maxX;
			velocityX = -Math.abs(velocityX) * 0.68;
		}

		if (y <= 0 && velocityY < 0) {
			y = 0;
			velocityY = 0;
		}

		if (y >= maxY) {
			y = maxY;
			velocityY = 0;
			grounded = true;
		} else {
			grounded = false;
		}

		if (automaticMovementMode === 'wander' && currentTime - lastWanderOverlapCheck >= 250) {
			lastWanderOverlapCheck = currentTime;
			scheduleOverlapCheck();
		}

		updateSprite(currentTime);
		render();
		animationFrame = requestAnimationFrame(update);
	};

	character.classList.add('is-ready');
	setSpriteFrame(0);
	window.addEventListener('keydown', onKeyDown, { passive: false });
	window.addEventListener('keyup', onKeyUp, { passive: false });
	window.addEventListener('blur', onWindowBlur);
	window.addEventListener('resize', onResize);
	window.addEventListener('scroll', scheduleOverlapCheck, { passive: true });
	document.addEventListener('astro:page-load', onPageLoad);
	clampToViewport();
	guideTimer = window.setTimeout(hideGuide, 10_000);
	scheduleOverlapCheck();
	animationFrame = requestAnimationFrame(update);

	cleanupController = () => {
		cancelAnimationFrame(animationFrame);
		cancelAnimationFrame(avoidanceFrame);
		window.clearTimeout(guideTimer);
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('keyup', onKeyUp);
		window.removeEventListener('blur', onWindowBlur);
		window.removeEventListener('resize', onResize);
		window.removeEventListener('scroll', scheduleOverlapCheck);
		document.removeEventListener('astro:page-load', onPageLoad);
		controlledCharacter = null;
	};
};

setupCharacter();
document.addEventListener('astro:page-load', setupCharacter);
