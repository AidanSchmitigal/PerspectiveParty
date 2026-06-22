<script lang="ts">
	import BlobAvatar from '$lib/components/BlobAvatar.svelte';
	import { type Avatar, type GameState } from '$lib/game';

	let {
		gameState,
		avatar = $bindable(),
		name = $bindable(),
		joined = false,
		connectedPlayers = [] as { id: string; name: string; avatar: Avatar; connected: boolean }[],
		onupdate = () => {}
	}: {
		gameState: GameState;
		avatar: Avatar;
		name: string;
		joined?: boolean;
		connectedPlayers?: { id: string; name: string; avatar: Avatar; connected: boolean }[];
		onupdate?: () => void;
	} = $props();

	let avatarCanvas = $state<HTMLCanvasElement>();
	let brushColor = $state('#3a332c');
	let brushSize = $state(4);
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

	function clearCanvas() {
		const context = avatarCanvas?.getContext('2d');
		if (!context || !avatarCanvas) return;
		const rect = avatarCanvas.getBoundingClientRect();
		context.fillStyle = '#fffef9';
		context.fillRect(0, 0, rect.width, rect.height);
		avatar.drawing = '';
		if (joined) onupdate();
	}

	let connectedCount = $derived(connectedPlayers.length);
</script>

<div class="phone-frame">
	<div class="phone-notch"></div>
	<div class="phone-screen-pad">
		<div class="creator-section">
			<h2 class="section-title">make your doodler</h2>

			<div class="canvas-blob">
				<div class="canvas-blob-inner">
					<canvas
						use:prepareCanvas
						onpointerdown={startStroke}
						onpointermove={drawStroke}
						onpointerup={endStroke}
						onpointercancel={endStroke}
					></canvas>
				</div>
			</div>

			<div class="toolbar">
				<p class="label-tag">paint color</p>
				<div class="color-row">
					{#each palette as color (color)}
						<button
							class="color-dot"
							class:selected={brushColor === color}
							style="background: {color}"
							aria-label="Brush color {color}"
							onclick={() => (brushColor = color)}
						></button>
					{/each}
					<button
						class="color-dot"
						class:selected={brushColor === '#fffef9'}
						style="background: #fffef9; border-color: #ccc"
						title="eraser"
						aria-label="Eraser"
						onclick={() => (brushColor = '#fffef9')}
					></button>
				</div>
				<div class="brush-row">
					<button
						class="brush-btn"
						class:selected={brushSize == 8}
						onclick={() => (brushSize = 8)}
						title="thin brush"
					>
						·
					</button>
					<button
						class="brush-btn"
						class:selected={brushSize == 14}
						onclick={() => (brushSize = 14)}
						title="thick brush"
					>
						●
					</button>
					<button class="brush-btn clear-btn" onclick={clearCanvas} title="clear canvas">
						↺
					</button>
				</div>
			</div>

			<p class="label-tag">name your doodler</p>
			<input
				class="name-input"
				bind:value={name}
				onblur={joined ? onupdate : undefined}
				placeholder="Your name"
				maxlength={14}
			/>
		</div>

		<div class="players-section">
			<div class="mini-avatar-strip">
				{#each connectedPlayers as player (player.id)}
					<div class="mini-tile">
						<BlobAvatar src={player.avatar.drawing} size={38} blob={1} />
						<span class="mini-name">{player.name}</span>
					</div>
				{/each}
				{#if connectedPlayers.length === 0}
					<span class="empty-players">waiting for players…</span>
				{/if}
			</div>
			<p class="player-count">
				{connectedCount} doodler{connectedCount !== 1 ? 's' : ''} in the room
			</p>
		</div>
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

	.lobby-header {
		text-align: center;
		margin-bottom: 4px;
	}
	.room-label {
		font-family: 'Baloo 2', cursive;
		font-size: 12px;
		font-weight: 700;
		margin: 0;
		opacity: 0.55;
	}
	.waiting-text {
		font-family: 'Baloo 2', cursive;
		font-size: 15px;
		font-weight: 700;
		margin: 4px 0;
	}

	.creator-section {
		text-align: center;
	}
	.section-title {
		font-family: 'Baloo 2', cursive;
		font-size: 17px;
		margin: 4px 0 8px;
	}
	.canvas-blob {
		width: min(100%, 200px);
		margin: 0 auto;
		aspect-ratio: 1;
		border: 3px solid var(--ink);
		border-radius: 45% 55% 50% 50% / 55% 45% 55% 45%;
		overflow: hidden;
		box-shadow: 3px 3px 0 var(--ink);
		background: #fffef9;
	}
	.canvas-blob-inner {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	.canvas-blob-inner canvas {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
	}

	.toolbar {
		margin: 8px 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}
	.label-tag {
		font-family: 'Baloo 2', cursive;
		font-weight: 700;
		font-size: 12px;
		margin: 4px 0 2px;
		opacity: 0.7;
	}
	.color-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.color-dot {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 3px solid var(--ink);
		cursor: pointer;
		padding: 0;
	}
	.color-dot.selected {
		box-shadow:
			0 0 0 3px #fff,
			0 0 0 6px var(--ink);
	}
	.brush-row {
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
		font-size: 30px;
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

	.name-input {
		width: 100%;
		font-family: 'Patrick Hand', cursive;
		font-size: 16px;
		border: 2.5px solid var(--ink);
		border-radius: 10px;
		padding: 7px 10px;
		text-align: center;
		background: #fffef9;
		margin-top: 2px;
	}

	.players-section {
		margin-top: 12px;
	}
	.mini-avatar-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
	}
	.mini-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.mini-name {
		font-size: 10px;
		font-weight: 700;
		max-width: 44px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
	}
	.empty-players {
		font-size: 13px;
		opacity: 0.5;
	}
	.player-count {
		text-align: center;
		font-size: 13px;
		opacity: 0.65;
		margin: 8px 0 2px;
	}
</style>
