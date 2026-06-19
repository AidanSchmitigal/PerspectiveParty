export type Phase = 'lobby' | 'study' | 'draw' | 'reveal';

export type Avatar = {
	seed: string;
	color: string;
	shape: 'blob' | 'squircle' | 'star' | 'pebble';
	motif: 'spark' | 'eye' | 'orbit' | 'bolt' | 'flower' | 'moon';
};

export type Player = {
	id: string;
	name: string;
	avatar: Avatar;
	score: number;
	connected: boolean;
	joinedAt: number;
	drawing?: string;
	done?: boolean;
};

export type Challenge = {
	id: string;
	name: string;
	prompt: string;
	targetAngle: string;
	shape: 'cube' | 'stairs' | 'tower' | 'bridge';
};

export type GameState = {
	roomCode: string;
	phase: Phase;
	round: number;
	challenge: Challenge;
	players: Player[];
	updatedAt: number;
};

export type ClientMessage =
	| { type: 'join'; name: string; avatar: Avatar }
	| { type: 'set-player'; name: string; avatar: Avatar }
	| { type: 'phase'; phase: Phase }
	| { type: 'next-round' }
	| { type: 'drawing'; dataUrl: string }
	| { type: 'clear-drawing' }
	| { type: 'done'; done: boolean }
	| { type: 'score'; playerId: string; delta: number }
	| { type: 'reset' };

export type ServerMessage = { type: 'state'; state: GameState } | { type: 'hello'; id: string };

export const avatarColors = ['#ff6b5b', '#ffc83d', '#52bfee', '#7bc95e', '#b083e8', '#f490b8'];
export const avatarShapes: Avatar['shape'][] = ['blob', 'squircle', 'star', 'pebble'];
export const avatarMotifs: Avatar['motif'][] = ['spark', 'eye', 'orbit', 'bolt', 'flower', 'moon'];

export const challenges: Challenge[] = [
	{
		id: 'corner-cube',
		name: 'Corner Cube',
		prompt: 'Memorize the colored faces, then draw it from above-left.',
		targetAngle: 'Draw the view from above-left',
		shape: 'cube'
	},
	{
		id: 'stacky-stairs',
		name: 'Stacky Stairs',
		prompt: 'Watch the block staircase rotate. Keep track of the tall side.',
		targetAngle: 'Draw the view from the right side',
		shape: 'stairs'
	},
	{
		id: 'button-tower',
		name: 'Button Tower',
		prompt: 'Notice which blocks stick out before it spins away.',
		targetAngle: 'Draw the view from behind',
		shape: 'tower'
	},
	{
		id: 'wonky-bridge',
		name: 'Wonky Bridge',
		prompt: 'Track the gap under the bridge and the cap colors.',
		targetAngle: 'Draw the view from below-right',
		shape: 'bridge'
	}
];

export function makeRoomCode() {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = '';
	for (let index = 0; index < 4; index += 1) {
		code += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return code;
}

export function makeAvatar(seed = cryptoSafeRandom()) {
	const pick = (length: number, offset: number) => Math.abs(hashSeed(seed + offset)) % length;
	return {
		seed,
		color: avatarColors[pick(avatarColors.length, 1)],
		shape: avatarShapes[pick(avatarShapes.length, 2)],
		motif: avatarMotifs[pick(avatarMotifs.length, 3)]
	} satisfies Avatar;
}

export function sanitizeName(name: string) {
	const clean = name.trim().replace(/\s+/g, ' ').slice(0, 18);
	return clean || `Player ${Math.floor(Math.random() * 90) + 10}`;
}

function hashSeed(seed: string) {
	let hash = 0;
	for (let index = 0; index < seed.length; index += 1) {
		hash = (hash << 5) - hash + seed.charCodeAt(index);
		hash |= 0;
	}
	return hash;
}

function cryptoSafeRandom() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return Math.random().toString(36).slice(2);
}
