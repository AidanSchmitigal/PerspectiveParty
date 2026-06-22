<script lang="ts">
	import { type Player } from '$lib/game';
	import BlobAvatar from '$lib/components/BlobAvatar.svelte';

	let {
		self,
		players = [] as Player[],
		prompt = '',
		timerLabel = '',
		send = () => {}
	}: {
		self?: Player;
		players?: Player[];
		prompt?: string;
		timerLabel?: string;
		send?: (msg: object) => void;
	} = $props();

	let canvas = $state<HTMLCanvasElement>();
	let brushColor = $state('#3a332c');
	let brushSize = $state(6);
	let drawing = false;
	let lastPoint: { x: number; y: number } | null = null;
	let sendTimer: ReturnType<typeof setTimeout> | null = null;
	let submitted = $state(false);

	const palette = ['#3a332c', '#ff6b5b', '#52bfee', '#7bc95e', '#b083e8', '#ffc83d'];

	let otherPlayers = $derived(players.filter((p) => p.id !== self?.id));

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
		if (!canvas || submitted) return;
		canvas.setPointerCapture(event.pointerId);
		drawing = true;
		lastPoint = pointFromEvent(event);
	}

	function drawStroke(event: PointerEvent) {
		if (!canvas || !drawing || !lastPoint || submitted) return;
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

	function clearCanvas() {
		const context = canvas?.getContext('2d');
		if (!context || !canvas || submitted) return;
		context.fillStyle = '#fffef9';
		context.fillRect(0, 0, canvas.width, canvas.height);
		send({ type: 'clear-drawing' });
	}

	function submitDrawing() {
		if (!canvas || submitted) return;
		sendCanvasNow();
		send({ type: 'done', done: true });
		submitted = true;
	}
</script>

<div class="phone-frame">
	<div class="phone-notch"></div>
	<div class="phone-screen-pad">
		{#if otherPlayers.length > 0}
			<div class="top-avatar-strip">
				{#each otherPlayers as player (player.id)}
					<div class="strip-tile" title={player.name}>
						<BlobAvatar src={player.avatar.drawing} size={32} blob={1} />
						{#if player.done}
							<span class="done-badge">✓</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<div class="prompt-banner">
			<span>{prompt}</span>
			{#if timerLabel}
				<span class="timer-chip">{timerLabel}</span>
			{/if}
		</div>

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
			<div class="color-group">
				{#each palette as color (color)}
					<button
						class="color-dot"
						class:selected={brushColor === color}
						style="background: {color}"
						aria-label="Brush {color}"
						onclick={() => (brushColor = color)}
					></button>
				{/each}
				<button
					class="color-dot"
					class:selected={brushColor === '#fffef9'}
					style="background: #fffef9; border-color: #ccc"
					aria-label="Eraser"
					onclick={() => (brushColor = '#fffef9')}
				></button>
			</div>
			<div class="brush-group">
				<button
					class="brush-btn"
					class:selected={brushSize <= 4}
					onclick={() => (brushSize = 3)}
					title="thin brush">—</button
				>
				<button
					class="brush-btn"
					class:selected={brushSize > 4}
					onclick={() => (brushSize = 8)}
					title="thick brush">⎯</button
				>
				<button class="brush-btn clear-btn" onclick={clearCanvas} title="clear">↺</button>
			</div>
		</div>

		<button class="btn coral submit-btn" onclick={submitDrawing} disabled={submitted}>
			{submitted ? 'Submitted ✓' : 'Submit drawing 🎨'}
		</button>
	</div>
</div>

<style>
	.phone-frame {
		width: 100%;
		max-width: 380px;
		margin: 0 auto;
		background: #fff;
		border: 4px solid var(--ink);
		border-radius: 28px;
		padding: 12px 8px 14px;
		box-shadow: 5px 5px 0 var(--ink);
	}
	.phone-notch {
		width: 60px;
		height: 7px;
		background: var(--ink);
		border-radius: 8px;
		margin: 0 auto 8px;
	}
	.phone-screen-pad {
		padding: 2px 4px;
	}

	.top-avatar-strip {
		display: flex;
		gap: 6px;
		justify-content: center;
		margin-bottom: 8px;
	}
	.strip-tile {
		position: relative;
	}
	.done-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		width: 16px;
		height: 16px;
		background: var(--grass);
		border: 2px solid var(--ink);
		border-radius: 50%;
		font-size: 10px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 1px 1px 0 var(--ink);
	}

	.prompt-banner {
		background: var(--sky);
		border: 3px solid var(--ink);
		border-radius: 14px;
		padding: 10px 14px;
		text-align: center;
		font-family: 'Baloo 2', cursive;
		font-weight: 700;
		font-size: 14px;
		margin-bottom: 10px;
		box-shadow: 3px 3px 0 var(--ink);
		transform: rotate(-1deg);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}
	.timer-chip {
		background: var(--ink);
		color: #fff;
		border-radius: 8px;
		padding: 2px 8px;
		font-size: 13px;
		font-family: 'DM Sans', sans-serif;
		white-space: nowrap;
	}

	.canvas-wrap {
		border: 4px solid var(--ink);
		border-radius: 14px;
		overflow: hidden;
		background: #fff;
		box-shadow: 3px 3px 0 var(--ink);
	}
	.canvas-wrap canvas {
		display: block;
		width: 100%;
		height: 240px;
		touch-action: none;
		background: #fffef9;
	}

	.tool-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		margin: 10px 0;
	}
	.color-group {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.color-dot {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 2.5px solid var(--ink);
		cursor: pointer;
		padding: 0;
	}
	.color-dot.selected {
		box-shadow:
			0 0 0 2px #fff,
			0 0 0 4px var(--ink);
	}
	.brush-group {
		display: flex;
		gap: 6px;
		justify-content: center;
	}
	.brush-btn {
		width: 34px;
		height: 34px;
		border: 2.5px solid var(--ink);
		border-radius: 8px;
		background: #fff;
		cursor: pointer;
		font-size: 16px;
		font-weight: 700;
		box-shadow: 2px 2px 0 var(--ink);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.brush-btn.selected {
		background: var(--yellow);
	}
	.brush-btn:active {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 var(--ink);
	}
	.clear-btn {
		font-size: 18px;
	}

	.submit-btn {
		width: 100%;
		font-size: 18px;
	}
	.submit-btn:disabled {
		opacity: 0.6;
	}
</style>
