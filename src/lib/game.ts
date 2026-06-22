export type Phase = 'lobby' | 'study' | 'draw' | 'reveal' | 'vote';

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
	model: string;
};

export type GameState = {
	roomCode: string;
	phase: Phase;
	round: number;
	presenterId: string | null;
	challenge: Challenge;
	players: Player[];
	updatedAt: number;
	phaseStartedAt: number;
};

export type ClientMessage =
	| { type: 'join'; name: string; avatar: Avatar }
	| { type: 'set-player'; name?: string; avatar?: Avatar }
	| { type: 'phase'; phase: Phase }
	| { type: 'next-round' }
	| { type: 'drawing'; dataUrl: string }
	| { type: 'clear-drawing' }
	| { type: 'done'; done: boolean }
	| { type: 'score'; playerId: string; delta: number }
	| { type: 'reset' };

export type ServerMessage = { type: 'state'; state: GameState } | { type: 'hello'; id: string };

const modelNames = [
	'01',
	'02',
	'03',
	'04',
	'05',
	'06',
	'07',
	'08',
	'09',
	'10',
	'11',
	'12',
	'13',
	'14',
	'15',
	'16',
	'17',
	'18',
	'19',
	'20',
	'21',
	'22',
	'23',
	'24',
	'25',
	'26',
	'27',
	'28',
	'29',
	'30'
];

export const challenges: Challenge[] = modelNames.map((name) => ({
	id: `model-${name}`,
	name: `Shape ${name}`,
	prompt: 'Study the 3D shape from every angle.',
	targetAngle: 'Draw the view from above-left',
	model: `/models/${name}.glb`
}));

export const STUDY_DURATION = 10;
export const DRAW_DURATION = 60;

export function makeRoomCode() {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
	let code = '';
	for (let index = 0; index < 4; index += 1) {
		code += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return code;
}

export function makeAvatar() {
	return { drawing: '' } satisfies Avatar;
}

const defaultNames = ['Squiggle', 'Doodle', 'Wobble', 'Noodle', 'Zigzag', 'Pebble'];

export function sanitizeName(name: string) {
	const clean = name.trim().replace(/\s+/g, ' ').slice(0, 18);
	return clean || defaultNames[Math.floor(Math.random() * defaultNames.length)];
}
