import dotenv from 'dotenv';
import axios from 'axios';
import readline from 'readline';
import get from 'lodash/get';
import Mailgun from 'mailgun-js';
import {stripIndent} from 'common-tags';
import {nanoid} from 'nanoid';

dotenv.config();

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const {CTFD_HOST, CTFD_SESSION, MAILGUN_API_KEY} = process.env;

const mailgun = Mailgun({apiKey: MAILGUN_API_KEY!, domain: 'hakatashi.com'});

(async () => {
	const teamId = await new Promise((resolve) => {
		rl.question('Enter team id: ', resolve);
	});

	console.log('');
	console.log(`Team id: ${teamId}`);
	console.log('');

	console.log('Getting Team configuration...');

	const emails: string[] = ['pr-log@mail-hook.tsg.ne.jp'];

	console.log('Getting CSRF token...');
	const {data} = await axios.get(`${CTFD_HOST}/admin/notifications`, {
		headers: {
			Cookie: `session=${CTFD_SESSION}`,
		},
	});
	const [, token] = data.match(/'csrfNonce'\s*:\s*"(.+?)"/);
	console.log(`Got CSRF token: ${token}`);

	console.log('Getting team members...');
	const {data: result} = await axios.get(`${CTFD_HOST}/api/v1/teams/${teamId}/members`, {
		headers: {
			Cookie: `session=${CTFD_SESSION}`,
			'CSRF-Token': token,
		},
	});

	const members = get(result, 'data', []);
	console.log('CTFd team members:', members);

	for (const member of members) {
		const {data: result} = await axios.get(`${CTFD_HOST}/api/v1/users/${member}`, {
			headers: {
				Cookie: `session=${CTFD_SESSION}`,
				'CSRF-Token': token,
			},
		});
		const email = get(result, ['data', 'email']);
		emails.push(email);
	}

	const teamPassword = nanoid(16);

	const {data: patchResult} = await axios.patch(`${CTFD_HOST}/api/v1/teams/${teamId}`, JSON.stringify({
		password: teamPassword,
	}), {
		headers: {
			Cookie: `session=${CTFD_SESSION}`,
			'CSRF-Token': token,
			'Content-Type': 'application/json',
		},
	});

	const teamName = get(patchResult, ['data', 'name']);

	console.log({teamName, teamPassword, emails});

	await new Promise<void>((resolve) => {
		rl.question('Is this ok? [yN] ', (answer) => {
			if (answer.toLowerCase() === 'y') {
				rl.close();
				resolve();
			} else {
				process.exit();
			}
		});
	});

	const content = stripIndent`
		Hi team ${teamName} <br>

		We reset your team password. The new password is ${teamPassword} <br>

		TSG
	`;

	const mailResult = await new Promise((resolve) => {
		mailgun.messages().send({
			from: 'TSG <admin@tsg.ne.jp>',
			to: 'info@tsg.ne.jp',
			bcc: emails,
			subject: 'TSG CTF 2023 team password reset',
			text: content,
			html: content,
		}, (error, body) => {
			resolve(body);
		});
	});

	console.log(mailResult);
})();
