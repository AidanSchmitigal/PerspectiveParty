<script lang="ts">
	import { type Player } from '$lib/game';

	let {
		self = undefined,
		label = 'Drawing pad',
		send = (_msg: object) => {}
	}: {
		self?: Player | undefined;
		label?: string;
		send?: (msg: object) => void;
	} = $props();

	let canvas = $state<HTMLCanvasElement>();
	let brushColor = $state('#3a332c');
	let brushSize = $state(6);
	let drawing = false;
	let lastPoint: { x: number; y: number } | null = null;
	let sendTimer: ReturnType<typeof setTimeout> | null = null;

	const palette = ['#3a332c', '#ff6b5b', '#52bfee', '#7bc95e', '#b083e8', '#ffc83d'];

	function prepareCanvas(node: HTMLCanvasElement) {
		canvas = node;
		requestAnimationFrame(() => resetCanvas(node));
		return {
			destroy() {
				if (canvas === node) canvas = undefined;
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
		if (self?.drawing) {
			const image = new Image();
			image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
			image.src = self.drawing;
		}
	}

	function pointFromEvent(event: PointerEvent) {
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	function startStroke(event: PointerEvent) {
		if (!canvas) return;
		canvas.setPointerCapture(event.pointerId);
		drawing = true;
		lastPoint = pointFromEvent(event);
		play('tick');
	}

	function drawStroke(event: PointerEvent) {
		if (!canvas || !drawing || !lastPoint) return;
		const point = pointFromEvent(event);
		const context = canvas.getContext('2d');
		if (!context) return;
		context.strokeStyle = brushColor;
		context.lineWidth = brushSize;
		context.beginPath();
		context.moveTo(lastPoint.x, lastPoint.y);
		context.lineTo(point.x, point.y);
		context.stroke();
		lastPoint = point;
		queueCanvasSend();
	}

	function endStroke(event: PointerEvent) {
		if (!canvas || !drawing) return;
		drawing = false;
		lastPoint = null;
		canvas.releasePointerCapture(event.pointerId);
		sendCanvasNow();
	}

	function queueCanvasSend() {
		if (sendTimer) return;
		sendTimer = setTimeout(() => {
			sendCanvasNow();
			sendTimer = null;
		}, 250);
	}

	function sendCanvasNow() {
		if (!canvas) return;
		send({ type: 'drawing', dataUrl: canvas.toDataURL('image/webp', 0.68) });
	}

	function clear() {
		const context = canvas?.getContext('2d');
		if (!context || !canvas) return;
		context.fillStyle = '#fffef9';
		context.fillRect(0, 0, canvas.width, canvas.height);
		send({ type: 'clear-drawing' });
		play('tick');
	}

	function markDone() {
		sendCanvasNow();
		send({ type: 'done', done: true });
		play('honk');
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

<div class="sticker draw-card">
	<p class="label-tag">{label}</p>
	<div class="canvas-wrap">
		<canvas
			bind:this={canvas}
			onpointerdown={startStroke}
			onpointermove={drawStroke}
			onpointerup={endStroke}
			onpointercancel={endStroke}
			use:prepareCanvas
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
		<input class="size-slider" type="range" min="2" max="18" bind:value={brushSize} />
	</div>
	<div class="draw-actions">
		<button class="btn ghost" onclick={clear}>Clear</button>
		<button class="btn grass" onclick={markDone}>Done</button>
	</div>
</div>
