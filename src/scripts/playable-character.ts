const selector = '[data-playable-character]';
const controlledKeys = new Set(['a', 'd', 'w', 's']);

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
	let hasMoved = false;
	let facingDirection = -1;
	let previousTime = performance.now();
	let animationFrame = 0;
	let currentSpriteFrame = -1;

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

	const onKeyDown = (event: KeyboardEvent) => {
		const key = event.key.toLowerCase();
		const target = event.target;
		const isEditing = target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]');
		if (isEditing || !controlledKeys.has(key)) return;

		event.preventDefault();
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
		event.preventDefault();
	};

	const onWindowBlur = () => pressedKeys.clear();
	const onResize = () => {
		if (hasMoved) {
			clampToViewport();
			return;
		}

		x = Math.max(0, (window.innerWidth - character.offsetWidth) / 2);
		y = Math.max(0, window.innerHeight - character.offsetHeight);
		velocityX = 0;
		velocityY = 0;
		grounded = true;
		render();
	};

	const update = (currentTime: number) => {
		const elapsed = Math.min((currentTime - previousTime) / 1000, 0.032);
		previousTime = currentTime;

		const horizontalInput = Number(pressedKeys.has('d')) - Number(pressedKeys.has('a'));
		if (horizontalInput !== 0) facingDirection = horizontalInput;
		const acceleration = horizontalInput === 0 ? 1600 : 2050;
		const targetVelocity = horizontalInput * 310;
		const velocityDifference = targetVelocity - velocityX;
		const velocityChange = Math.sign(velocityDifference) * Math.min(Math.abs(velocityDifference), acceleration * elapsed);
		velocityX += velocityChange;

		velocityY += (pressedKeys.has('s') ? 2650 : 1750) * elapsed;
		const previousX = x;
		const previousY = y;
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

		if (!hasMoved && (Math.abs(x - previousX) > 0.1 || Math.abs(y - previousY) > 0.1)) {
			hasMoved = true;
			character.classList.add('has-moved');
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
	clampToViewport();
	animationFrame = requestAnimationFrame(update);

	cleanupController = () => {
		cancelAnimationFrame(animationFrame);
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('keyup', onKeyUp);
		window.removeEventListener('blur', onWindowBlur);
		window.removeEventListener('resize', onResize);
		controlledCharacter = null;
	};
};

setupCharacter();
document.addEventListener('astro:page-load', setupCharacter);
