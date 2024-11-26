import dotenv from 'dotenv';
import readline from 'readline';
import Mailgun from 'mailgun-js';
import {stripIndent} from 'common-tags';

dotenv.config();

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const {MAILGUN_API_KEY} = process.env;

const mailgun = Mailgun({apiKey: MAILGUN_API_KEY!, domain: 'hakatashi.com'});

(async () => {
	const text = stripIndent`
		Note: This email is being sent to users who have registered for previous TSG CTFs. If you wish to unsubscribe, visit %mailing_list_unsubscribe_url%

		Hello hackers. After two years of silence, we are back. If you enjoyed the previous TSG CTF, this is good news!

		We are pleased to announce that TSG CTF 2023 will be held this weekend from 07:00 on November 4th to 07:00 on November 5th (UTC). This time as well, we are putting a lot of effort into reviews and making sure that challenges are published in the best possible way.

		Also, it's worth mentioning that the top hackers will be rewarded by dollars. Sponsored by Flatt Security, Inc., the prizes are as follows: 1st place receives 1,000 USD, 2nd place 500 USD, and 3rd place 200 USD.

		The scoreboard is ready. Register now!
		https://score.ctf.tsg.ne.jp/

		Sincerely,
		Koki Takahashi (@hakatashi), a leader of team TSG
	`;

	const html = stripIndent`
		<table width="100%" border="0" cellspacing="0" cellpadding="0">
		<tr>
		<td style="text-align: center;">
		<img src="https://score.ctf.tsg.ne.jp/themes/tsgctf/static/ogimage.jpg" alt="TSG CTF 2023" style="max-width: 600px;">
		</td>
		</tr>
		</table>

		<p>
		Note: This email is being sent to users who have registered for previous TSG CTFs. If you wish to unsubscribe, click <a href="%mailing_list_unsubscribe_url%">here</a>.
		</p>

		<p>
		Hello hackers. After two years of silence, we are back. If you enjoyed the previous TSG CTF, this is good news!
		</p>

		<p>
		We are pleased to announce that TSG CTF 2023 will be held this weekend from 07:00 on November 4th to 07:00 on November 5th (UTC). This time as well, we are putting a lot of effort into reviews and making sure that challenges are published in the best possible way.
		</p>

		<p>
		Also, it's worth mentioning that the top hackers will be rewarded by dollars. Sponsored by Flatt Security, Inc., the prizes are as follows: 1st place receives 1,000 USD, 2nd place 500 USD, and 3rd place 200 USD.
		</p>

		<p>
		The scoreboard is ready. Register now!<br>
		https://score.ctf.tsg.ne.jp/
		</p>

		<p>
		Sincerely,<br>
		Koki Takahashi (@hakatashi), a leader of team TSG
		</p>
	`;

	console.log('HTML:');
	console.log(html);
	console.log('');

	console.log('Text:');
	console.log(text);
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

	const mailResult = await new Promise((resolve) => {
		mailgun.messages().send({
			from: 'TSG <admin@tsg.ne.jp>',
			to: 'tsgctf-announcements@hakatashi.com',
			subject: 'Invitation to TSG CTF 2023',
			text,
			html,
		}, (error, body) => {
			resolve(body);
		});
	});

	console.log(mailResult);
})();
