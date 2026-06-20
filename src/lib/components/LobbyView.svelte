<script lang="ts">
	import { type GameState, type Player } from '$lib/game';

	let {
		gameState,
		isPresenter = false,
		qrDataUrl = '',
		connectedPlayers = [] as Player[],
		onstart = () => {}
	}: {
		gameState: GameState;
		isPresenter?: boolean;
		qrDataUrl?: string;
		connectedPlayers?: Player[];
		onstart?: () => void;
	} = $props();

	let playerCount: number = $derived(connectedPlayers.length);

	// Simple deterministic "color" and "face" from player id so it matches the DESIGN.html blob style
	function playerColor(index: number): string {
		const colors = [
			'var(--coral)',
			'var(--sky)',
			'var(--yellow)',
			'var(--grass)',
			'var(--grape)',
			'var(--pink)'
		];
		return colors[index % colors.length];
	}

	function playerEmoji(index: number): string {
		const emojis = ['😺', '🐸', '🦊', '🐼', '🐙', '🐝'];
		return emojis[index % emojis.length];
	}

	function blobClass(index: number): string {
		const classes = ['blob1', 'blob2', 'blob3'];
		return classes[index % classes.length];
	}
</script>

<section class="lobby-frame confetti-wrap">
	<span class="confetti" style="top: 6px; left: 10%; animation-delay: 0.2s">✦</span>
	<span class="confetti" style="top: 30px; left: 80%; animation-delay: 1s">🎈</span>
	<span class="confetti" style="top: 6px; left: 55%; animation-delay: 1.6s">✦</span>
	<span class="confetti" style="top: 60px; left: 30%; animation-delay: 0.8s">🎈</span>

	<div style="text-align: center">
		<h1 class="squiggle-underline" style="font-size: 34px; margin: 0 0 6px">
			Perspective Party
			<svg viewBox="0 0 200 10" preserveAspectRatio="none">
				<path
					d="M0,6 Q10,0 20,6 T40,6 T60,6 T80,6 T100,6 T120,6 T140,6 T160,6 T180,6 T200,6"
					stroke="var(--coral)"
					stroke-width="4"
					fill="none"
					stroke-linecap="round"
				/>
			</svg>
		</h1>
		<p style="margin: 0 0 16px; font-size: 16px">grab your phone and join the room</p>
		<div class="flex justify-center gap-8">
			<div class="room-code-sticker">
				<div style="font-size: 13px; font-weight: 700; margin-bottom: 2px">room code</div>
				<div class="code">{gameState.roomCode}</div>
			</div>
			{#if isPresenter && qrDataUrl}
				<img class="lobby-qr" src={qrDataUrl} alt="QR code to join room" />
			{/if}
		</div>
	</div>

	<h3 style="margin: 22px 0 0; text-align: center">
		{playerCount} doodler{playerCount !== 1 ? 's' : ''} in the room
	</h3>
	<div class="player-grid">
		{#each connectedPlayers as player, i (player.id)}
			<div class="player-tile">
				<div class="avatar {blobClass(i)}" style="background: {playerColor(i)}">
					{#if player.avatar.drawing}
						<img class="avatar-img" src={player.avatar.drawing} alt={player.name} />
					{:else}
						{playerEmoji(i)}
					{/if}
				</div>
				<div class="avatar-name">{player.name}</div>
			</div>
		{/each}
		{#if connectedPlayers.length === 0}
			<div class="player-tile">
				<div class="avatar blob1" style="background: #fff; border-style: dashed">…</div>
				<div class="avatar-name">waiting</div>
			</div>
		{/if}
	</div>

	{#if isPresenter}
		<div style="text-align: center; margin-top: 24px">
			<button class="btn coral" style="font-size: 20px" onclick={onstart} disabled={playerCount < 2}
				>start game ▶</button
			>
		</div>
	{/if}
</section>

<style>
	.lobby-frame {
		background: #fff;
		border: 5px solid var(--ink);
		border-radius: 18px;
		padding: 18px 22px 22px;
		box-shadow: 7px 7px 0 var(--ink);
		background-image: linear-gradient(180deg, #fffef9, #fff);
	}

	.confetti-wrap {
		position: relative;
	}
	.confetti {
		position: absolute;
		font-size: 20px;
		opacity: 0.8;
		animation: float 3.5s ease-in-out infinite;
		pointer-events: none;
	}
	@keyframes float {
		0%,
		100% {
			transform: translateY(0) rotate(0deg);
		}
		50% {
			transform: translateY(-10px) rotate(12deg);
		}
	}

	.room-code-sticker {
		background: var(--coral);
		border: 4px solid var(--ink);
		border-radius: 20px;
		padding: 18px 30px;
		display: inline-block;
		box-shadow: 5px 5px 0 var(--ink);
		transform: rotate(-2deg);
	}
	.room-code-sticker .code {
		font-family: 'Baloo 2', cursive;
		font-size: 46px;
		font-weight: 800;
		color: #3a1208;
		letter-spacing: 6px;
	}

	.player-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
		gap: 14px;
		margin-top: 18px;
	}
	.player-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.avatar {
		width: 54px;
		height: 54px;
		border: 3px solid var(--ink);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
		box-shadow: 2px 2px 0 var(--ink);
		flex-shrink: 0;
		overflow: hidden;
	}
	.avatar.blob1 {
		border-radius: 55% 45% 50% 50% / 50% 55% 45% 50%;
	}
	.avatar.blob2 {
		border-radius: 45% 55% 50% 50% / 55% 45% 55% 45%;
	}
	.avatar.blob3 {
		border-radius: 50% 50% 45% 55% / 45% 50% 55% 50%;
	}
	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.avatar-name {
		font-size: 13px;
		text-align: center;
		margin-top: 4px;
		font-weight: 700;
		color: var(--ink);
		max-width: 64px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.lobby-qr {
		width: 150px;
		height: 150px;
		border: 4px solid var(--ink);
		border-radius: 20px;
		box-shadow: 5px 5px 0 var(--ink);
		transform: rotate(2deg);
	}
	.share-input {
		font-family: 'Patrick Hand', cursive;
		font-size: 13px;
		text-align: center;
		border: 2px solid var(--ink);
		border-radius: 8px;
		padding: 4px 8px;
		background: #fffef9;
		width: 100%;
		max-width: 280px;
	}
</style>
