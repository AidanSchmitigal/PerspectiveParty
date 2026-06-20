<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { SvelteURL } from 'svelte/reactivity';
	import QRCode from 'qrcode';
	import { roomState } from '$lib/room.svelte';
	import {
		makeAvatar,
		sanitizeName,
		type Avatar,
		type GameState,
		type Phase,
		type ServerMessage
	} from '$lib/game';
	import AvatarEditor from '$lib/components/AvatarEditor.svelte';
	import DrawingCanvas from '$lib/components/DrawingCanvas.svelte';
	import LobbyView from '$lib/components/LobbyView.svelte';

	let { params } = $props();

	let roomCode = $derived(params.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
	let socket = $state<WebSocket | null>(null);
	let selfId = $state('');
	let gameState = $state<GameState | null>(null);
	let name = $state('');
	let avatar = $state<Avatar>(makeAvatar());
	let shareUrl = $state('');
	let qrDataUrl = $state('');
	let joined = $state(false);

	let audioContext: AudioContext | null = null;

	let self = $derived(gameState?.players.find((player) => player.id === selfId));
	let connectedPlayers = $derived(gameState?.players.filter((player) => player.connected) ?? []);
	let sortedPlayers = $derived(
		[...(gameState?.players ?? [])].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
	);
	let isPresenter = $derived(gameState?.presenterId === selfId);

	$effect(() => {
		if (gameState && gameState.phase === 'lobby' && !joined && roomState.connected && !isPresenter) {
			joined = true;
			sendJoin();
		}
	});

	$effect(() => {
		if (shareUrl) {
			QRCode.toDataURL(shareUrl, {
				width: 240,
				margin: 1,
				color: { dark: '#3a332c', light: '#fffef9' }
			}).then((url) => {
				qrDataUrl = url;
			});
		}
	});

	onMount(() => {
		name = localStorage.getItem('perspective-party-name') || '';
		const storedAvatar = localStorage.getItem('perspective-party-avatar');
		if (storedAvatar) avatar = JSON.parse(storedAvatar) as Avatar;
		connect();
	});

	function getWsUrl(code: string) {
		const envHost = import.meta.env.VITE_WS_HOST as string | undefined;
		if (envHost) return `ws://${envHost}?room=${code}`;
		if (
			typeof window !== 'undefined' &&
			['localhost', '127.0.0.1'].includes(window.location.hostname)
		) {
			return `ws://localhost:3001?room=${code}`;
		}
		return `wss://${window.location.host}?room=${code}`;
	}

	function connect() {
		socket?.close();
		joined = false;
		shareUrl = makeShareUrl(roomCode);

		const nextSocket = new WebSocket(getWsUrl(roomCode));
		socket = nextSocket;
		nextSocket.addEventListener('open', () => {
			roomState.connected = true;
			play('pop');
		});
		nextSocket.addEventListener('close', () => {
			roomState.connected = false;
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

	function joinGame() {
		joined = true;
		sendJoin();
		play('pop');
	}

	function makeShareUrl(code: string) {
		const url = new SvelteURL(window.location.href);
		url.search = '';
		return url.toString();
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
	<title>Perspective Party — {roomCode}</title>
	<meta name="description" content="Perspective Party room {roomCode}." />
</svelte:head>

{#if gameState && gameState.phase === 'lobby'}
		<LobbyView
			{gameState}
			{isPresenter}
			{shareUrl}
			{qrDataUrl}
			{connectedPlayers}
			onstart={() => setPhase('study')}
		/>

		{#if !isPresenter}
			<AvatarEditor bind:avatar bind:name {joined} onupdate={sendJoin} />
		{/if}
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
										{#if player.avatar.drawing}
											<img class="mini-avatar" src={player.avatar.drawing} alt={`${player.name}'s avatar`} />
										{:else}
											<div class="mini-avatar"></div>
										{/if}
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
							{#if player.avatar.drawing}
								<img class="avatar" src={player.avatar.drawing} alt={`${player.name}'s avatar`} />
							{:else}
								<div class="avatar"></div>
							{/if}
							<div>
								<strong>{player.name}</strong>
								<span>{player.score} pts{player.done ? ' - done' : ''}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<aside class="control-panel">
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
				{:else if joined}
					<AvatarEditor bind:avatar bind:name {joined} onupdate={sendJoin} />

					<DrawingCanvas
						self={self}
						{send}
						label={gameState.phase === 'draw' ? gameState.challenge.targetAngle : 'Drawing pad'}
					/>
				{:else}
					<AvatarEditor bind:avatar bind:name {joined} onupdate={sendJoin} label="Customize your player" />
					<button class="btn grass full" onclick={joinGame}>Join Game</button>
				{/if}
			</aside>
		</section>
	{/if}
