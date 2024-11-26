import dotenv from 'dotenv';
import axios from 'axios';
import nodeCron from 'node-cron';

dotenv.config();

const message = `
@everyone **Welcome to TSG CTF Discord!**

* This Discord server is not a place to collaborate with other people to solve challenges. Do not put any hint for challenge or solution in any message. Be fair!
* Be polite and respect others.
* glhf!

**## Transparent Release Policy**

We are disclosing the release time of each challenges before the contest. It will be important for you to check it out. See here:
<https://score.ctf.tsg.ne.jp/rules>

**## Beginner's Tasks**

As you can see there are challenges named "Beginner's XXX", which is truly designed for beginners! Try harder and get the flag!

**## Sanity Check**

Here is your sanity 🙂

\`${process.env.SANITY_CHECK_FLAG}\`
`.trim();

const post = async () => {
	const {data: discordResult} = await axios.post(process.env.DISCORD_README_WEBHOOK_URL!, {
		content: message,
	});
	console.log(discordResult);
};

nodeCron.schedule('0 0 16 * * *', post);

