<script lang="ts">
	import { type GameState, type Player } from '$lib/game';

	let {
		gameState,
		isPresenter = false,
		shareUrl = '',
		qrDataUrl = '',
		connectedPlayers = [] as Player[],
		onstart = () => {}
	}: {
		gameState: GameState;
		isPresenter?: boolean;
		shareUrl?: string;
		qrDataUrl?: string;
		connectedPlayers?: Player[];
		onstart?: () => void;
	} = $props();
</script>

<section class="lobby-board">
	<div class="lobby-hero">
		<div class="lobby-code">
			<span>Room</span>
			<strong>{gameState.roomCode}</strong>
		</div>

		{#if qrDataUrl}
			<img class="lobby-qr" src={qrDataUrl} alt="QR code to join room" />
		{/if}

		{#if isPresenter}
			<input class="share-input" readonly value={shareUrl} />
		{/if}
	</div>

	<div class="player-row">
		{#each connectedPlayers as player (player.id)}
			<div class="player-chip">
				{#if player.avatar.drawing}
					<img class="avatar" src={player.avatar.drawing} alt={`${player.name}'s avatar`} />
				{:else}
					<div class="avatar"></div>
				{/if}
				<div>
					<strong>{player.name}</strong>
				</div>
			</div>
		{/each}
		{#if connectedPlayers.length === 0}
			<p class="lobby-empty">Waiting for players…</p>
		{/if}
	</div>

	{#if isPresenter}
		<div class="lobby-actions">
			<button class="btn grass" onclick={onstart}>Start Game</button>
		</div>
	{/if}
</section>
