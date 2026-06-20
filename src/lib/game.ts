export type Phase = 'lobby' | 'study' | 'draw' | 'reveal';

export type Avatar = {
	drawing: string;
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
	presenterId: string | null;
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

export function makeAvatar() {
	return { drawing: '' } satisfies Avatar;
}

export function sanitizeName(name: string) {
	const clean = name.trim().replace(/\s+/g, ' ').slice(0, 18);
	return clean || `Player ${Math.floor(Math.random() * 90) + 10}`;
}


