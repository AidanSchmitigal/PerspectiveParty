<script lang="ts">
	import { type Avatar } from '$lib/game';

	let {
		avatar = $bindable(),
		name = $bindable(),
		joined = false,
		label = 'Your player',
		onupdate = () => {}
	}: {
		avatar: Avatar;
		name: string;
		joined?: boolean;
		label?: string;
		onupdate?: () => void;
	} = $props();

	let avatarCanvas = $state<HTMLCanvasElement>();
	let brushColor = $state('#3a332c');
	let brushSize = $state(3);
	let drawing = false;
	let lastPoint: { x: number; y: number } | null = null;

	const palette = ['#3a332c', '#ff6b5b', '#52bfee', '#7bc95e', '#b083e8', '#ffc83d'];

	function prepareCanvas(node: HTMLCanvasElement) {
		avatarCanvas = node;
		requestAnimationFrame(() => resetCanvas(node));
		return {
			destroy() {
				if (avatarCanvas === node) avatarCanvas = undefined;
			}
		};
	}

	function resetCanvas(node: HTMLCanvasElement) {
		const rect = node.getBoundingClientRect();
		const scale = window.devicePixelRatio || 1;
		node.width = Math.floor(rect.width * scale);
		node.height = Math.floor(rect.height * scale);
		const context = node.getContext('2d');
		if (!context) return;
		context.scale(scale, scale);
		context.lineCap = 'round';
		context.lineJoin = 'round';
		context.fillStyle = '#fffef9';
		context.fillRect(0, 0, rect.width, rect.height);
		if (avatar.drawing) {
			const image = new Image();
			image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
			image.src = avatar.drawing;
		}
	}

	function pointFromEvent(event: PointerEvent) {
		if (!avatarCanvas) return { x: 0, y: 0 };
		const rect = avatarCanvas.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	function startStroke(event: PointerEvent) {
		if (!avatarCanvas) return;
		avatarCanvas.setPointerCapture(event.pointerId);
		drawing = true;
		lastPoint = pointFromEvent(event);
		play('tick');
	}

	function drawStroke(event: PointerEvent) {
		if (!avatarCanvas || !drawing || !lastPoint) return;
		const point = pointFromEvent(event);
		const context = avatarCanvas.getContext('2d');
		if (!context) return;
		context.strokeStyle = brushColor;
		context.lineWidth = brushSize;
		context.beginPath();
		context.moveTo(lastPoint.x, lastPoint.y);
		context.lineTo(point.x, point.y);
		context.stroke();
		lastPoint = point;
	}

	function endStroke(event: PointerEvent) {
		if (!avatarCanvas || !drawing) return;
		drawing = false;
		lastPoint = null;
		avatarCanvas.releasePointerCapture(event.pointerId);
		avatar.drawing = avatarCanvas.toDataURL('image/webp', 0.68);
		if (joined) onupdate();
	}

	function clear() {
		const context = avatarCanvas?.getContext('2d');
		if (!context || !avatarCanvas) return;
		const rect = avatarCanvas.getBoundingClientRect();
		context.fillStyle = '#fffef9';
		context.fillRect(0, 0, rect.width, rect.height);
		avatar.drawing = '';
		if (joined) onupdate();
		play('tick');
	}

	function play(kind: 'pop' | 'honk' | 'tick') {
		if (typeof window === 'undefined') return;
		const audioContext = new AudioContext();
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
</script>

<div class="sticker creator">
	<p class="label-tag">{label}</p>
	<div class="avatar-canvas-wrap">
		<canvas
			use:prepareCanvas
			onpointerdown={startStroke}
			onpointermove={drawStroke}
			onpointerup={endStroke}
			onpointercancel={endStroke}
		></canvas>
	</div>
	<div class="tool-row">
		{#each palette as color (color)}
			<button
				class="tool-btn"
				class:selected={brushColor === color}
				style={`--tool:${color}`}
				title={`Brush ${color}`}
				onclick={() => (brushColor = color)}
			></button>
		{/each}
		<input class="size-slider" type="range" min="1" max="8" bind:value={brushSize} />
	</div>
	<input class="name-input" bind:value={name} onblur={joined ? onupdate : undefined} placeholder="Your name" />
	<button class="btn ghost full" onclick={clear}>Clear avatar</button>
</div>
