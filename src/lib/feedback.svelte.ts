let audioContext: AudioContext | undefined;

export function play(kind: 'pop' | 'honk' | 'tick') {
	if (typeof window === 'undefined') return;
	audioContext ??= new AudioContext();
	const oscillator = audioContext.createOscillator();
	const gain = audioContext.createGain();
	const now = audioContext.currentTime;
	oscillator.type = kind === 'honk' ? 'square' : 'sine';
	oscillator.frequency.setValueAtTime(kind === 'honk' ? 180 : kind === 'pop' ? 520 : 760, now);
	oscillator.frequency.exponentialRampToValueAtTime(kind === 'honk' ? 130 : 260, now + 0.12);
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(kind === 'honk' ? 0.1 : 0.045, now + 0.015);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
	oscillator.connect(gain).connect(audioContext.destination);
	oscillator.start(now);
	oscillator.stop(now + 0.18);
}

export function clickFeedback(node: HTMLElement) {
	if (node.parentElement?.dataset.haptic) return { destroy() {} };

	const style = getComputedStyle(node);
	const isPositioned = style.position === 'absolute' || style.position === 'fixed';

	const wrapper = document.createElement('div');
	wrapper.dataset.haptic = 'true';

	if (isPositioned) {
		wrapper.style.position = style.position;
		wrapper.style.top = style.top;
		wrapper.style.right = style.right;
		wrapper.style.bottom = style.bottom;
		wrapper.style.left = style.left;
		wrapper.style.width = style.width;
		wrapper.style.height = style.height;
		wrapper.style.margin = style.margin;
		wrapper.style.zIndex = style.zIndex;

		node.style.position = 'static';
		node.style.width = '100%';
		node.style.height = '100%';
		node.style.margin = '0';
	} else {
		wrapper.style.cssText = 'position: relative; display: inline-block';
	}

	node.parentNode?.insertBefore(wrapper, node);
	wrapper.appendChild(node);

	node.style.pointerEvents = 'none';

	const input = document.createElement('input');
	input.type = 'checkbox';
	input.setAttribute('switch', '');
	input.style.cssText = `
		position: absolute; inset: 0; width: 100%; height: 100%;
		margin: 0; opacity: 0; cursor: pointer;
		clip-path: inset(0 round 999px);
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	`;

	input.addEventListener('change', () => {
		input.checked = false;
		navigator.vibrate?.(10);
		play('pop');
		node.click();
	});

	wrapper.appendChild(input);

	return {
		destroy() {
			input.remove();
			node.style.pointerEvents = '';
			if (isPositioned) {
				node.style.position = style.position;
				node.style.top = style.top;
				node.style.right = style.right;
				node.style.bottom = style.bottom;
				node.style.left = style.left;
				node.style.width = style.width;
				node.style.height = style.height;
				node.style.margin = style.margin;
			}
			wrapper.parentNode?.insertBefore(node, wrapper);
			wrapper.remove();
		}
	};
}
