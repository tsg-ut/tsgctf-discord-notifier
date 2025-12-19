import dotenv from "dotenv";
import axios from "axios";
import readline from "readline";
import get from "lodash/get";
import Mailgun from "mailgun-js";
import { stripIndent } from "common-tags";
import { nanoid } from "nanoid";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const { CTFD_HOST, CTFD_SESSION, MAILGUN_API_KEY } = process.env;

const mailgun = Mailgun({ apiKey: MAILGUN_API_KEY!, domain: "tsg.ne.jp" });

(async () => {
  const userId = await new Promise((resolve) => {
    rl.question("Enter user id: ", resolve);
  });

  console.log("");
  console.log(`User id: ${userId}`);
  console.log("");

  console.log("Getting User configuration...");

  const emails: string[] = ["pr-log@mail-hook.tsg.ne.jp"];

  console.log("Getting CSRF token...");
  const { data } = await axios.get(`${CTFD_HOST}/admin/notifications`, {
    headers: {
      Cookie: `session=${CTFD_SESSION}`,
    },
  });
  const [, token] = data.match(/'csrfNonce'\s*:\s*"(.+?)"/);
  console.log(`Got CSRF token: ${token}`);

  /* 
  console.log('Getting team members...');
  const {data: result} = await axios.get(`${CTFD_HOST}/api/v1/teams/${userId}/members`, {
    headers: {
      Cookie: `session=${CTFD_SESSION}`,
      'CSRF-Token': token,
    },
  }); */

  // const members = get(result, 'data', []);
  // console.log('CTFd team members:', members);

  /* for (const member of members) {
    const {data: result} = await axios.get(`${CTFD_HOST}/api/v1/users/${member}`, {
      headers: {
        Cookie: `session=${CTFD_SESSION}`,
        'CSRF-Token': token,
      },
    });
    const email = get(result, ['data', 'email']);
    emails.push(email);
  } */
  const { data: result } = await axios.get(
    `${CTFD_HOST}/api/v1/users/${userId}`,
    {
      headers: {
        Cookie: `session=${CTFD_SESSION}`,
        "CSRF-Token": token,
      },
    }
  );
  const email = get(result, ["data", "email"]);
  emails.push(email);

  const userPassword = nanoid(16);

  const { data: patchResult } = await axios.patch(
    `${CTFD_HOST}/api/v1/users/${userId}`,
    JSON.stringify({
      password: userPassword,
    }),
    {
      headers: {
        Cookie: `session=${CTFD_SESSION}`,
        "CSRF-Token": token,
        "Content-Type": "application/json",
      },
    }
  );

  const userName = get(patchResult, ["data", "name"]);

  console.log({ userName, userPassword: userPassword, emails });

  await new Promise<void>((resolve) => {
    rl.question("Is this ok? [yN] ", (answer) => {
      if (answer.toLowerCase() === "y") {
        rl.close();
        resolve();
      } else {
        process.exit();
      }
    });
  });

  const content = stripIndent`
		Hi ${userName} <br>

		We reset your user password. The new password is ${userPassword} <br>

		TSG
	`;

  const mailResult = await new Promise((resolve) => {
    mailgun.messages().send(
      {
        from: "TSG CTF 2025 <tsgctf@tsg.ne.jp>",
        to: "info@tsg.ne.jp",
        bcc: emails,
        subject: "TSG CTF 2025 user password reset",
        text: content,
        html: content,
      },
      (error, body) => {
        resolve(body);
      }
    );
  });

  console.log(mailResult);
})();
