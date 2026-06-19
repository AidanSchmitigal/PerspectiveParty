<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURL, SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		avatarColors,
		avatarMotifs,
		avatarShapes,
		makeAvatar,
		makeRoomCode,
		sanitizeName,
		type Avatar,
		type GameState,
		type Phase,
		type ServerMessage
	} from '$lib/game';

	let roomInput = $state('');
	let roomCode = $state('');
	let role = $state<'player' | 'presenter'>('player');
	let socket = $state<WebSocket | null>(null);
	let connected = $state(false);
	let selfId = $state('');
	let gameState = $state<GameState | null>(null);
	let name = $state('');
	let avatar = $state<Avatar>(makeAvatar());
	let brushColor = $state('#3a332c');
	let brushSize = $state(6);
	let shareUrl = $state('');
	let canvas = $state<HTMLCanvasElement>();
	let drawing = false;
	let lastPoint: { x: number; y: number } | null = null;
	let sendTimer: ReturnType<typeof setTimeout> | null = null;
	let audioContext: AudioContext | null = null;

	const palette = ['#3a332c', '#ff6b5b', '#52bfee', '#7bc95e', '#b083e8', '#ffc83d'];

	let self = $derived(gameState?.players.find((player) => player.id === selfId));
	let connectedPlayers = $derived(gameState?.players.filter((player) => player.connected) ?? []);
	let sortedPlayers = $derived(
		[...(gameState?.players ?? [])].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
	);
	let hasRoom = $derived(Boolean(roomCode && gameState));
	let isPresenter = $derived(role === 'presenter');

	onMount(() => {
		const params = new SvelteURLSearchParams(window.location.search);
		const urlRoom = params.get('room')?.toUpperCase() ?? '';
		const urlRole = params.get('view') === 'presenter' ? 'presenter' : 'player';
		role = urlRole;
		name = localStorage.getItem('perspective-party-name') || '';
		const storedAvatar = localStorage.getItem('perspective-party-avatar');
		if (storedAvatar) avatar = JSON.parse(storedAvatar) as Avatar;
		if (urlRoom) connect(urlRoom, urlRole, false);
	});

	function getWsUrl(roomCode: string) {
		const envHost = import.meta.env.VITE_WS_HOST as string | undefined;
		if (envHost) return `ws://${envHost}?room=${roomCode}`;
		if (
			typeof window !== 'undefined' &&
			['localhost', '127.0.0.1'].includes(window.location.hostname)
		) {
			return `ws://localhost:3001?room=${roomCode}`;
		}
		return `wss://${window.location.host}?room=${roomCode}`;
	}

	function connect(code: string, requestedRole = role, updateUrl = true) {
		const cleanCode = code
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, 8);
		if (!cleanCode) return;
		socket?.close();
		roomCode = cleanCode;
		role = requestedRole;
		shareUrl = makeShareUrl(cleanCode, 'player');
		if (updateUrl) {
			const params = new SvelteURLSearchParams({ room: cleanCode });
			if (requestedRole === 'presenter') params.set('view', 'presenter');
			replaceState(resolve(`/?${params.toString()}`), {});
		}

		const nextSocket = new WebSocket(getWsUrl(cleanCode));
		socket = nextSocket;
		nextSocket.addEventListener('open', () => {
			connected = true;
			sendJoin();
			play('pop');
		});
		nextSocket.addEventListener('close', () => {
			connected = false;
		});
		nextSocket.addEventListener('message', (event) => {
			const message = JSON.parse(event.data as string) as ServerMessage;
			if (message.type === 'hello') selfId = message.id;
			if (message.type === 'state') gameState = message.state;
		});
	}

	function send(message: object) {
		if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
	}

	function sendJoin() {
		const cleanName = sanitizeName(name || localStorage.getItem('perspective-party-name') || '');
		name = cleanName;
		localStorage.setItem('perspective-party-name', cleanName);
		localStorage.setItem('perspective-party-avatar', JSON.stringify(avatar));
		send({ type: 'join', name: cleanName, avatar });
	}

	function createRoom() {
		connect(makeRoomCode(), 'presenter');
	}

	function joinRoom() {
		connect(roomInput, 'player');
	}

	function makeShareUrl(code: string, view: 'player' | 'presenter') {
		const url = new SvelteURL(window.location.href);
		url.search = '';
		url.searchParams.set('room', code);
		if (view === 'presenter') url.searchParams.set('view', 'presenter');
		return url.toString();
	}

	function randomizeAvatar() {
		avatar = makeAvatar();
		play('tick');
		sendJoin();
	}

	function updateAvatar(patch: Partial<Avatar>) {
		avatar = { ...avatar, ...patch };
		sendJoin();
	}

	function setPhase(phase: Phase) {
		send({ type: 'phase', phase });
		play(phase === 'draw' ? 'honk' : 'pop');
	}

	function nextRound() {
		send({ type: 'next-round' });
		play('honk');
	}

	function addScore(playerId: string, delta: number) {
		send({ type: 'score', playerId, delta });
		play(delta > 0 ? 'pop' : 'tick');
	}

	function clearDrawing() {
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

	function play(kind: 'pop' | 'honk' | 'tick') {
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
</script>

<svelte:head>
	<title>Perspective Party</title>
	<meta
		name="description"
		content="A Jackbox-like spatial reasoning drawing game."
	/>
</svelte:head>

<main class="app-shell">
	<header class="topbar">
		<div>
			<p class="eyebrow">Perspective Party</p>
			<h1>Draw the shape from memory.</h1>
		</div>
		<div class="status-pill" class:online={connected}>{connected ? 'Live room' : 'Offline'}</div>
	</header>

	{#if !hasRoom}
		<section class="hero-board">
			<div class="hero-copy">
				<p class="round-label">Presenter + phones</p>
				<h2>Spin a weird 3D shape. Hide it. Everybody draws the new angle.</h2>
				<div class="join-strip">
					<button class="btn coral" onclick={createRoom}>Create room</button>
					<div class="join-box">
						<input
							class="name-input"
							placeholder="ROOM"
							bind:value={roomInput}
							onkeydown={(event) => event.key === 'Enter' && joinRoom()}
						/>
						<button class="btn sky" onclick={joinRoom}>Join</button>
					</div>
				</div>
			</div>
			<div class="mini-scene" aria-label="Spinning cube preview">
				<div class="cube cube-large">
					<div class="face front">?</div>
					<div class="face back"></div>
					<div class="face right"></div>
					<div class="face left"></div>
					<div class="face top"></div>
					<div class="face bottom"></div>
				</div>
			</div>
		</section>
	{:else if gameState}
		<section class="room-grid" class:presenter-mode={isPresenter}>
			<div class="stage-panel">
				<div class="room-header">
					<div>
						<p class="round-label">Round {gameState.round + 1} / {gameState.challenge.name}</p>
						<h2>{gameState.challenge.prompt}</h2>
					</div>
					<div class="room-code">
						<span>Room</span>
						<strong>{gameState.roomCode}</strong>
					</div>
				</div>

				<div class="stage">
					<div class="phase-stamp">{gameState.phase}</div>
					{#if gameState.phase === 'reveal'}
						<div class="drawing-grid">
							{#each sortedPlayers as player (player.id)}
								<article class="drawing-card">
									{#if player.drawing}
										<img src={player.drawing} alt={`${player.name}'s drawing`} />
									{:else}
										<div class="empty-drawing">No drawing yet</div>
									{/if}
									<div class="drawing-meta">
										<div class="mini-avatar" style={`--avatar-color:${player.avatar.color}`}>
											<span class={`motif ${player.avatar.motif}`}></span>
										</div>
										<strong>{player.name}</strong>
										<span>{player.score} pts</span>
									</div>
									{#if isPresenter}
										<div class="score-controls">
											<button
												class="icon-btn"
												title="Remove point"
												onclick={() => addScore(player.id, -1)}
											>
												-
											</button>
											<button
												class="icon-btn"
												title="Add point"
												onclick={() => addScore(player.id, 1)}
											>
												+
											</button>
										</div>
									{/if}
								</article>
							{/each}
						</div>
					{:else}
						<div class={`shape-scene ${gameState.challenge.shape}`}>
							<div class="shape-shadow"></div>
							<div class="block block-a"></div>
							<div class="block block-b"></div>
							<div class="block block-c"></div>
							<div class="block block-d"></div>
							<div class="block block-e"></div>
						</div>
					{/if}
				</div>

				<p class="target-angle">{gameState.challenge.targetAngle}</p>

				<div class="player-row">
					{#each connectedPlayers as player (player.id)}
						<div class="player-chip" class:done={player.done}>
							<div
								class={`avatar ${player.avatar.shape}`}
								style={`--avatar-color:${player.avatar.color}`}
							>
								<span class={`motif ${player.avatar.motif}`}></span>
							</div>
							<div>
								<strong>{player.name}</strong>
								<span>{player.score} pts{player.done ? ' - done' : ''}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<aside class="control-panel">
				<div class="mode-tabs">
					<button class:active={role === 'player'} onclick={() => (role = 'player')}>Player</button>
					<button class:active={role === 'presenter'} onclick={() => (role = 'presenter')}
						>Presenter</button
					>
				</div>

				{#if isPresenter}
					<div class="sticker">
						<p class="label-tag">Share link</p>
						<input class="share-input" readonly value={shareUrl} />
						<div class="presenter-actions">
							<button class="btn grass" onclick={() => setPhase('study')}>Study</button>
							<button class="btn coral" onclick={() => setPhase('draw')}>Draw</button>
							<button class="btn grape" onclick={() => setPhase('reveal')}>Reveal</button>
							<button class="btn sky" onclick={nextRound}>Next</button>
						</div>
					</div>
				{:else}
					<div class="sticker creator">
						<p class="label-tag">Your player</p>
						<div
							class={`big-avatar avatar ${avatar.shape}`}
							style={`--avatar-color:${avatar.color}`}
						>
							<span class={`motif ${avatar.motif}`}></span>
						</div>
						<input class="name-input" bind:value={name} onblur={sendJoin} placeholder="Your name" />
						<div class="swatch-row">
							{#each avatarColors as color (color)}
								<button
									class="swatch"
									class:selected={avatar.color === color}
									style={`--swatch:${color}`}
									title={color}
									onclick={() => updateAvatar({ color })}
								></button>
							{/each}
						</div>
						<div class="picker-row">
							{#each avatarShapes as shape (shape)}
								<button
									class:active={avatar.shape === shape}
									onclick={() => updateAvatar({ shape })}
								>
									{shape}
								</button>
							{/each}
						</div>
						<div class="picker-row">
							{#each avatarMotifs as motif (motif)}
								<button
									class:active={avatar.motif === motif}
									onclick={() => updateAvatar({ motif })}
								>
									{motif}
								</button>
							{/each}
						</div>
						<button class="btn yellow full" onclick={randomizeAvatar}>Shuffle avatar</button>
					</div>

					<div class="sticker draw-card">
						<p class="label-tag">
							{gameState.phase === 'draw' ? gameState.challenge.targetAngle : 'Drawing pad'}
						</p>
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
							<button class="btn ghost" onclick={clearDrawing}>Clear</button>
							<button class="btn grass" onclick={markDone}>Done</button>
						</div>
					</div>
				{/if}
			</aside>
		</section>
	{/if}
</main>
