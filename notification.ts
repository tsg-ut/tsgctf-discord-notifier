import dotenv from 'dotenv';
import axios from 'axios';
import readline from 'readline';
import get from 'lodash/get';

dotenv.config();

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const {CTFD_HOST, CTFD_SESSION, ONESIGNAL_APP_ID, ONESIGNAL_API_KEY, DISCORD_ANNOUNCEMENT_WEBHOOK_URL, TWITTER_WEBHOOK_URL} = process.env;

type NotificationType = 'ctfd' | 'discord' | 'twitter' | 'onesignal';

const destinations: NotificationType[] = ['ctfd', 'onesignal', 'discord', 'twitter'];
const contextUrl = 'https://score.ctf.tsg.ne.jp/challenges';

(async () => {
	const title = await new Promise((resolve) => {
		rl.question('Enter notification title: ', resolve);
	});

	const contentEn = await new Promise((resolve) => {
		rl.question('Enter english message: ', resolve);
	});

	const contentJa = await new Promise((resolve) => {
		rl.question('Enter japanese message: ', resolve);
	});

	console.log('');
	console.log(`Title: ${title}`);
	console.log(`English content: ${contentEn}`);
	console.log(`Japanese content: ${contentJa}`);
	console.log(`Context URL: ${contextUrl}`);
	console.log(`Delivers to: ${destinations.join(', ')}`);
	console.log('');

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

	if (destinations.includes('ctfd')) {
		console.log('Delivering CTFd Notification...');

		try {
			console.log('Getting CSRF token...');
			const {data} = await axios.get(`${CTFD_HOST}/admin/notifications`, {
				headers: {
					Cookie: `session=${CTFD_SESSION}`,
				},
			});
			const [, token] = data.match(/'csrfNonce'\s*:\s*"(.+?)"/);
			console.log(`Got CSRF token: ${token}`);

			console.log('Posting notification...');
			const {data: result} = await axios.post(`${CTFD_HOST}/api/v1/notifications`, JSON.stringify({
				title,
				content: [contentEn, '---', contentJa].join('\n'),
				type: 'toast',
				sound: false,
			}), {
				headers: {
					Cookie: `session=${CTFD_SESSION}`,
					'CSRF-Token': token,
					'Content-Type': 'application/json',
				},
			});

			console.log('CTFd notification posted:', result);
		} catch (e) {
			console.error('CTFd delivery failed.');
			console.error(e);
		}
	}

	if (destinations.includes('onesignal')) {
		console.log('Delivering WebPush...');;

		try {
			const {data: result} = await axios.post('https://onesignal.com/api/v1/notifications', {
				app_id: ONESIGNAL_APP_ID,
				headings: {
					en: title,
					ja: title,
				},
				contents: {
					en: contentEn,
					ja: contentJa,
				},
				url: contextUrl,
				included_segments: ['Subscribed Users'],
			}, {
				headers: {
					Authorization: `Basic ${ONESIGNAL_API_KEY}`,
				},
			});

			console.log('WebPush notification posted:', result);
		} catch (e) {
			console.error('WebPush delivery failed.');
			console.error(get(e, ['response', 'data']));
		}
	}

	if (destinations.includes('discord')) {
		console.log('Delivering Discord...');;

		try {
			const {data: result} = await axios.post(DISCORD_ANNOUNCEMENT_WEBHOOK_URL!, {
				content: [
					'@everyone',
					`**${title}**`,
					contentEn,
					contentJa,
					contextUrl,
				].join('\n'),
			});

			console.log('Discord message posted:', result);
		} catch (e) {
			console.error('Discord delivery failed.');
			console.error(e);
		}
	}

	if (destinations.includes('twitter')) {
		console.log('Delivering Twitter...');;

		try {
			const {data: result1} = await axios.post(TWITTER_WEBHOOK_URL!, {
				value1: [
					title,
					contentEn,
					`${contextUrl} #tsg_ctf`,
				].join('\n'),
			});

			const {data: result2} = await axios.post(TWITTER_WEBHOOK_URL!, {
				value1: [
					contentJa,
					`${contextUrl} #tsg_ctf`,
				].join('\n'),
			});

			console.log('Twitter message posted:', result1, result2);
		} catch (e) {
			console.error('Twitter delivery failed.');
			console.error(e);
		}
	}
})();
