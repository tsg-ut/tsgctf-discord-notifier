import dotenv from 'dotenv';
import axios from 'axios';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';
import storage from 'node-persist';

dotenv.config();

const {CTFD_HOST, CTFD_SESSION, DISCORD_RANDOM_WEBHOOK_URL, DISCORD_GENERAL_WEBHOOK_URL} = process.env;

interface Challenge {
	solves: number,
	id: number,
	name: string,
}

interface Solve {
	account_id: number,
	name: string,
	date: string,
}

const checkTeamSize = async () => {
	console.log('[team-size] Getting CSRF token...');
	const {data} = await axios.get(`${CTFD_HOST}/admin/statistics`, {
		headers: {
			Cookie: `session=${CTFD_SESSION}`,
		},
	});
	const [, token] = data.match(/'csrfNonce'\s*:\s*"(.+?)"/);
	console.log(`[team-size] Got CSRF token: ${token}`);

	console.log('[team-size] Getting teams...');
	const {data: teamsResult} = await axios.get(`${CTFD_HOST}/api/v1/teams`, {
		headers: {
			Cookie: `session=${CTFD_SESSION}`,
			'CSRF-Token': token,
		},
	});

	const teamCount = get(teamsResult, ['meta', 'pagination', 'total'], 0);
	console.log({teamCount});

	const previousTeamCount = (await storage.getItem('teamCount')) || 0;
	console.log({previousTeamCount});

	const prevAchievement = Math.floor(teamCount / 100) * 100;
	console.log({prevAchievement});

	if (prevAchievement > previousTeamCount) {
		const {data: discordResult} = await axios.post(DISCORD_RANDOM_WEBHOOK_URL!, {
			content: `We hit ${prevAchievement} registrants! <https://score.ctf.tsg.ne.jp/scoreboard>`,
		});
		console.log(discordResult);
	}

	await storage.setItem('teamCount', teamCount);
};

const checkFirstBlood = async () => {
	console.log('[first-blood] Getting CSRF token...');
	const {data} = await axios.get(`${CTFD_HOST}/admin/statistics`, {
		headers: {
			Cookie: `session=${CTFD_SESSION}`,
		},
	});
	const [, token] = data.match(/'csrfNonce'\s*:\s*"(.+?)"/);
	console.log(`[first-blood] Got CSRF token: ${token}`);

	console.log('[first-blood] Getting challenges...');
	const {data: {data: challenges}}: {data: {data: Challenge[]}} = await axios.get(`${CTFD_HOST}/api/v1/challenges`, {
		headers: {
			Cookie: `session=${CTFD_SESSION}`,
			'CSRF-Token': token,
		},
	});

	const solvedChallenges = challenges.filter(({solves}) => solves > 0).map(({id}) => id);
	console.log({solvedChallenges});

	const previousSolvedChallenges = new Set((await storage.getItem('solvedChallenges')) || []);
	console.log({previousSolvedChallenges});

	for (const challenge of solvedChallenges) {
		if (previousSolvedChallenges.has(challenge)) {
			continue;
		}

		console.log(`[first-blood] Getting solves for challenge ${challenge}...`);
		const {data: {data: solves}}: {data: {data: Solve[]}} = await axios.get(`${CTFD_HOST}/api/v1/challenges/${challenge}/solves`, {
			headers: {
				Cookie: `session=${CTFD_SESSION}`,
				'CSRF-Token': token,
			},
		});

		if (solves.length === 0) {
			console.error(`[first-blood] Challenge ${challenge} has no solves!`);
			continue;
		}

		const firstBloodSolve = sortBy(solves, ({date}) => new Date(date).getTime())[0]!;
		console.log({firstBloodSolve});

		const challengeDatum = challenges.find(({id}) => id === challenge)!;
		console.log({challengeDatum});

		const {data: discordResult} = await axios.post(DISCORD_GENERAL_WEBHOOK_URL!, {
			content: `Team **${firstBloodSolve.name}** first-blooded **${challengeDatum.name}**!!! Congrats!`,
		});
		console.log(discordResult);
	}

	await storage.setItem('solvedChallenges', solvedChallenges);
};

storage.init({dir: '.cache'}).then(() => {
	console.log('Started');
	setInterval(checkTeamSize, 1000 * 60);
	setInterval(checkFirstBlood, 1000 * 60);
});
