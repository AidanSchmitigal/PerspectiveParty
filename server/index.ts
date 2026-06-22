import { createServer } from 'http';
import { parse } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import {
	challenges,
	sanitizeName,
	type Avatar,
	type ClientMessage,
	type GameState,
	type Player,
	type ServerMessage
} from '../src/lib/game';

const PORT = parseInt(process.env.PORT || '3001', 10);

class GameRoom {
	state: GameState;
	private connections = new Map<string, WebSocket>();
	destroyed = false;

	constructor(roomCode: string) {
		this.state = {
			roomCode,
			phase: 'lobby',
			round: 0,
			presenterId: null,
			challenge: challenges[0],
			players: [],
			updatedAt: Date.now(),
			phaseStartedAt: Date.now()
		};
	}

	addConnection(id: string, ws: WebSocket) {
		this.connections.set(id, ws);
		ws.send(JSON.stringify({ type: 'hello', id } satisfies ServerMessage));

		if (!this.state.presenterId) {
			this.state.presenterId = id;
		}

		this.broadcastState();
	}

	removeConnection(id: string) {
		this.connections.delete(id);

		if (id === this.state.presenterId && !this.destroyed) {
			this.destroyed = true;
			for (const [, ws] of this.connections) {
				ws.close(1000, 'Presenter disconnected');
			}
			this.state.players = [];
			this.state.presenterId = null;
			this.broadcastState();
			return;
		}

		const wasPlayer = this.state.players.some((p) => p.id === id);
		if (wasPlayer) {
			this.state.players = this.state.players.filter((p) => p.id !== id);
		}

		this.touch();
		this.broadcastState();
	}

	handleMessage(message: string, senderId: string) {
		let parsed: ClientMessage;
		try {
			parsed = JSON.parse(message) as ClientMessage;
		} catch {
			return;
		}

		switch (parsed.type) {
			case 'join':
				this.upsertPlayer(senderId, parsed.name, parsed.avatar);
				break;
			case 'set-player':
				this.upsertPlayer(senderId, parsed.name, parsed.avatar);
				break;
			case 'phase':
				this.state.phase = parsed.phase;
				this.state.phaseStartedAt = Date.now();
				if (parsed.phase === 'study' || parsed.phase === 'draw') this.clearDoneFlags();
				break;
			case 'next-round':
				this.state.round += 1;
				this.state.phase = 'study';
				this.state.phaseStartedAt = Date.now();
				this.state.challenge = challenges[this.state.round % challenges.length];
				this.state.players = this.state.players.map((player) => ({
					...player,
					drawing: undefined,
					done: false
				}));
				break;
			case 'drawing':
				this.patchPlayer(senderId, { drawing: parsed.dataUrl, done: false });
				break;
			case 'clear-drawing':
				this.patchPlayer(senderId, { drawing: undefined, done: false });
				break;
			case 'done':
				this.patchPlayer(senderId, { done: parsed.done });
				break;
			case 'score':
				this.state.players = this.state.players.map((player) =>
					player.id === parsed.playerId
						? { ...player, score: Math.max(0, player.score + parsed.delta) }
						: player
				);
				break;
			case 'reset':
				this.state = this.makeInitialState();
				break;
		}

		this.touch();
		this.broadcastState();
	}

	get isEmpty() {
		return this.connections.size === 0;
	}

	private makeInitialState(): GameState {
		return {
			roomCode: this.state.roomCode,
			phase: 'lobby',
			round: 0,
			presenterId: null,
			challenge: challenges[0],
			players: [],
			updatedAt: Date.now(),
			phaseStartedAt: Date.now()
		};
	}

	private upsertPlayer(id: string, name: string, avatar: Avatar) {
		const cleanName = sanitizeName(name);
		const existing = this.state.players.find((player) => player.id === id);
		if (existing) {
			existing.name = cleanName;
			existing.avatar = avatar;
			existing.connected = true;
			return;
		}
		this.state.players.push({
			id,
			name: cleanName,
			avatar,
			score: 0,
			connected: true,
			joinedAt: Date.now()
		});
	}

	private patchPlayer(id: string, patch: Partial<Player>) {
		this.state.players = this.state.players.map((player) =>
			player.id === id ? { ...player, ...patch } : player
		);
	}

	private clearDoneFlags() {
		this.state.players = this.state.players.map((player) => ({ ...player, done: false }));
	}

	private touch() {
		this.state.updatedAt = Date.now();
	}

	private broadcastState() {
		const payload = JSON.stringify({ type: 'state', state: this.state } satisfies ServerMessage);
		for (const ws of this.connections.values()) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(payload);
			}
		}
	}
}

const rooms = new Map<string, GameRoom>();

const server = createServer((_req, res) => {
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.end('Perspective Party WS Server\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
	const url = parse(req.url || '', true);
	const roomCode = ((url.query.room as string) || '')
		.toUpperCase()
		.replace(/[^A-Z]/g, '')
		.slice(0, 8);
	if (!roomCode) {
		ws.close(4000, 'Room code required');
		return;
	}

	const id = crypto.randomUUID();
	let room = rooms.get(roomCode);
	if (!room) {
		room = new GameRoom(roomCode);
		rooms.set(roomCode, room);
	}

	room.addConnection(id, ws);

	ws.on('message', (data) => {
		room?.handleMessage(data.toString(), id);
	});

	ws.on('close', () => {
		room?.removeConnection(id);
		if (room?.isEmpty || room?.destroyed) {
			rooms.delete(roomCode);
		}
	});
});

server.listen(PORT, () => {
	console.log(`WS server listening on port ${PORT}`);
});
