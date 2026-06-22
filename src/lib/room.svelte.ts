import { type GameState, type ServerMessage } from './game';

class RoomState {
	connected = $state(false);
	selfId = $state('');
	_gameState = $state<GameState | null>(null);

	#socket: WebSocket | null = null;

	get gameState(): GameState {
		console.assert(this._gameState && this.connected, 'Game state not available');
		return this._gameState!;
	}

	get ready() {
		return this.connected && this._gameState !== null;
	}

	connect(code: string) {
		this.#socket?.close();
		this.connected = false;
		this.selfId = '';
		this._gameState = null;

		const ws = new WebSocket(getWsUrl(code));
		this.#socket = ws;
		ws.addEventListener('open', () => {
			this.connected = true;
		});
		ws.addEventListener('close', () => {
			this.connected = false;
		});
		ws.addEventListener('message', (event) => {
			const message = JSON.parse(event.data as string) as ServerMessage;
			if (message.type === 'hello') this.selfId = message.id;
			if (message.type === 'state') this._gameState = message.state;
		});
	}

	send(message: object) {
		if (this.#socket?.readyState === WebSocket.OPEN) {
			this.#socket.send(JSON.stringify(message));
		}
	}
}

function getWsUrl(code: string) {
	return `ws://${window.location.host}/ws?room=${code}`;
}

export const roomState = new RoomState();
