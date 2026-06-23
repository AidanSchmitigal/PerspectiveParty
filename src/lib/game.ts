export type Phase = 'lobby' | 'study' | 'draw' | 'reveal';

const angles = ['Red', 'Green', 'Blue', 'Yellow', 'Cyan', 'Magenta'] as const;
export type Angles = (typeof angles)[number];

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
	targetAngle: Angles;
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
	targetAngle: angles[Math.floor(Math.random() * angles.length)],
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

export function getTimeRemaining(phase: Phase, startedAt: number, now?: number) {
	now ??= Date.now();
	let duration = 0;
	switch (phase) {
		case 'study':
			duration = STUDY_DURATION;
			break;
		case 'draw':
			duration = DRAW_DURATION;
			break;
		default:
			break;
	}
	const remaining = Math.max(0, duration * 1000 - (now - startedAt));
	const totalSeconds = Math.ceil(remaining / 1000);
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}
