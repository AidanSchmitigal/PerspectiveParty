<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import QRCode from 'qrcode';
	import { roomState } from '$lib/room.svelte';
	import {
		STUDY_DURATION,
		DRAW_DURATION,
		makeAvatar,
		sanitizeName,
		type Avatar,
		type Phase
	} from '$lib/game';
	import BlobAvatar from '$lib/components/BlobAvatar.svelte';
	import AvatarEditor from '$lib/components/AvatarEditor.svelte';
	import LobbyView from '$lib/components/LobbyView.svelte';
	import PhoneDraw from '$lib/components/PhoneDraw.svelte';
	import PhoneLobby from '$lib/components/PhoneLobby.svelte';
	import PresenterScene from '$lib/components/PresenterScene.svelte';

	let name = $state('');
	let avatar = $state<Avatar>(makeAvatar());
	let shareUrl = $state('');
	let qrDataUrl = $state('');
	let joined = $state(false);

	let audioContext: AudioContext | null = null;
	let timer = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	let gameState = $derived(roomState.gameState);

	let timerLabel = $derived.by(() => {
		if (
			gameState.phase === 'lobby' ||
			gameState.phase === 'reveal' ||
			gameState.phase === 'vote'
		)
			return '';
		const total = gameState.phase === 'study' ? STUDY_DURATION : DRAW_DURATION;
		const remaining = Math.max(0, total - timer);
		const m = Math.floor(remaining / 60);
		const s = remaining % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	});

	$effect(() => {
		const gs = gameState;
		const phase = gs.phase;
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		if (phase === 'study' || phase === 'draw') {
			const total = phase === 'study' ? STUDY_DURATION : DRAW_DURATION;
			const startedAt = gs.phaseStartedAt;
			timerInterval = setInterval(() => {
				const elapsed = Math.floor((Date.now() - startedAt) / 1000);
				timer = Math.min(elapsed, total);
				if (elapsed >= total) {
					clearInterval(timerInterval!);
					timerInterval = null;
					if (isPresenter) {
						setPhase(phase === 'study' ? 'draw' : 'reveal');
					}
				}
			}, 1000);
			timer = Math.min(Math.floor((Date.now() - startedAt) / 1000), total);
			return () => {
				if (timerInterval) clearInterval(timerInterval);
			};
		} else {
			timer = 0;
		}
	});

	let self = $derived(gameState.players.find((player) => player.id === roomState.selfId));
	let connectedPlayers = $derived(gameState.players.filter((player) => player.connected));
	let sortedPlayers = $derived(
		[...gameState.players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
	);
	let isPresenter = $derived(gameState.presenterId === roomState.selfId);

	$effect(() => {
		if (gameState.phase === 'lobby' && !joined && roomState.connected && !isPresenter) {
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
	});

	function sendJoin() {
		const cleanName = sanitizeName(name || localStorage.getItem('perspective-party-name') || '');
		name = cleanName;
		localStorage.setItem('perspective-party-name', cleanName);
		localStorage.setItem('perspective-party-avatar', JSON.stringify(avatar));
		roomState.send({ type: 'join', name: cleanName, avatar });
	}

	function joinGame() {
		joined = true;
		sendJoin();
		play('pop');
	}

	function makeShareUrl() {
		const url = new SvelteURL(window.location.href);
		url.search = '';
		return url.toString();
	}

	function setPhase(phase: Phase) {
		roomState.send({ type: 'phase', phase });
		play(phase === 'draw' ? 'honk' : 'pop');
	}

	function nextRound() {
		roomState.send({ type: 'next-round' });
		play('honk');
	}

	function addScore(playerId: string, delta: number) {
		roomState.send({ type: 'score', playerId, delta });
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

{#if gameState.phase === 'lobby'}
	{#if isPresenter}
		<LobbyView
			{gameState}
			{isPresenter}
			{qrDataUrl}
			{connectedPlayers}
			onstart={() => setPhase('study')}
		/>
	{:else}
		<PhoneLobby {gameState} bind:avatar bind:name {joined} {connectedPlayers} onupdate={sendJoin} />
	{/if}
{:else}
	<section class="room-grid" class:presenter-mode={isPresenter}>
		<div class="stage-panel">
			<div class="room-header">
				<div class="question-banner">
					<span class="round-label">Round {gameState.round + 1} / {gameState.challenge.name}</span>
					<h2>{gameState.challenge.prompt}</h2>
				</div>
				<div class="room-code">
					<span>Room</span>
					<strong>{gameState.roomCode}</strong>
				</div>
			</div>

			<div class="stage">
				{#if gameState.phase === 'reveal' || gameState.phase === 'vote'}
					<div class="drawing-grid">
						{#each sortedPlayers as player (player.id)}
							<article class="drawing-card">
								{#if player.drawing}
									<img src={player.drawing} alt={`${player.name}'s drawing`} />
								{:else}
									<div class="empty-drawing">No drawing yet</div>
								{/if}
								<div class="drawing-meta">
									<BlobAvatar src={player.avatar.drawing} size={38} blob={1} />
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
				{:else if isPresenter}
					<div class="scene-wrap">
						<PresenterScene
							model={gameState.challenge.model}
							phase={gameState.phase}
							{timerLabel}
						/>
					</div>
				{/if}
			</div>

			<p class="target-angle">{gameState.challenge.targetAngle}</p>

			<div class="player-row">
				{#each connectedPlayers as player, i (player.id)}
					<div class="player-chip" class:done={player.done}>
						<BlobAvatar src={player.avatar.drawing} size={42} blob={([1, 2, 3] as const)[i % 3]} />
						<div class="player-info">
							<strong>{player.name}</strong>
							<div class="player-status">
								{#if player.done}
									<span class="done-badge-sm">✓</span>
								{:else if gameState.phase === 'draw'}
									<span class="drawing-label">drawing…</span>
								{/if}
							</div>
						</div>
						{#if gameState.phase === 'draw' && isPresenter && player.drawing}
							<img class="mini-drawing" src={player.drawing} alt={`${player.name}'s drawing`} />
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<aside class="control-panel">
			{#if isPresenter}
				<div class="sticker">
					<p class="label-tag">Controls</p>
					{#if gameState.phase === 'study' || gameState.phase === 'draw'}
						<p class="timer-label">{timerLabel} remaining</p>
					{:else if gameState.phase === 'reveal'}
						<div class="presenter-actions">
							<button class="btn sky" onclick={nextRound}>Next Round</button>
						</div>
					{/if}
				</div>
			{:else if joined && gameState.phase === 'draw'}
				<PhoneDraw
					{self}
					players={gameState.players}
					prompt={gameState.challenge.targetAngle}
					{timerLabel}
					send={roomState.send.bind(roomState)}
				/>
			{:else if joined}
				<div class="phase-waiting">
					<p class="waiting-text">
						{gameState.phase === 'study' ? 'Study the shape…' : 'Waiting…'}
					</p>
				</div>
			{:else}
				<AvatarEditor
					bind:avatar
					bind:name
					{joined}
					onupdate={sendJoin}
					label="Customize your player"
				/>
				<button class="btn grass full" onclick={joinGame}>Join Game</button>
			{/if}
		</aside>
	</section>
{/if}
