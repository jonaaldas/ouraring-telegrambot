// @ts-nocheck
var CronJob = require('cron').CronJob;
const axios = require('axios');
const cors = require('cors');
const express = require('express');
const moment = require('moment');
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const token = '5944254577:AAFzY654PFQgN7GvP_nWMhrvskYf9ISBdDg';
const bot = new TelegramBot(token, { polling: true });
var chatId = '-868027154';

var app = express();

const PORT = process.env.PORT || 3011;

let startDate = moment(new Date()).subtract(1, 'days').format('YYYY-MM-DD');
let endDate = moment(new Date()).format('YYYY-MM-DD');

app.use(express.json());
app.use(cors());
const config = {
	headers: { Authorization: `Bearer ${process.env.OURA_RING_TOKEN}` },
};
let sleep = `https://api.ouraring.com/v2/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`;
let dailySleep = `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`;

const sleepRequest = axios.get(sleep, config);

const dailySleepRequest = axios.get(dailySleep, config);

let job = new CronJob(
	'0 9 * * *',
	function () {
		axios
			.all([sleepRequest, dailySleepRequest])
			.then(
				axios.spread((...responses) => {
					const responseOne = responses[0];
					const responseThree = responses[1];
					let sleepEntryPoint = responseOne.data.data[0];
					let dailySleepEntryPoint = responseThree.data.data[0];

					let totalSleep =
						(sleepEntryPoint.rem_sleep_duration +
							sleepEntryPoint.light_sleep_duration +
							sleepEntryPoint.deep_sleep_duration) /
						3600;

					let ouraData = {
						day: dailySleepEntryPoint?.day,
						sleepScore: dailySleepEntryPoint?.score,
						totalSleepTime: totalSleep.toFixed(1),
						timeInBed: sleepEntryPoint.time_in_bed / 3600,
						avrageHeartRate: sleepEntryPoint.average_hrv + 'BPM',
						restfulness: dailySleepEntryPoint?.contributors.restfulness,
						remSleep: (
							(sleepEntryPoint.rem_sleep_duration / 3600) *
							100
						).toFixed(1),
						readinesRestingHeartRate:
							sleepEntryPoint.readiness.contributors.resting_heart_rate + '%',
						readinessScore: sleepEntryPoint.readiness.score,
						bodyTempeture:
							sleepEntryPoint.readiness.contributors.body_temperature,
						recoveryIndex:
							sleepEntryPoint.readiness.contributors.recovery_index,
						sleepBalance: sleepEntryPoint.readiness.contributors.sleep_balance,
					};

					let text = `
			Oura Stats for Today
			⏳ ${ouraData.day}
			😴 Sleep Data
			${ouraData.sleepScore <= 70 ? '🥲' : '👍🏼'}  Sleep Socre ${ouraData.sleepScore}
			${ouraData.totalSleepTime <= 70 ? '🥲' : '👍🏼'}  Total Sleep Time ${
						ouraData.totalSleepTime
					}H
			${ouraData.timeInBed <= 70 ? '🥲' : '👍🏼'}  Time in Bed ${ouraData.timeInBed}
			❤️  Average Heart Rate ${ouraData.avrageHeartRate}
			${ouraData.restfulness <= 70 ? '🥲' : '👍🏼'}   Restfullness ${
						ouraData.restfulness
					}%
			${ouraData.remSleep < 70 ? '🥲' : '👍🏼'}   Rem Sleep ${ouraData.remSleep}%
			😎Readiness
			${ouraData.readinessScore <= 70 ? '🥲' : '👍🏼'}   Readiness Score ${
						ouraData.readinessScore
					}
			😴💙   Resting Heart Rate ${ouraData.readinesRestingHeartRate}
			${ouraData.bodyTempeture < 70 ? '🥲' : '👍🏼'}   Body Tempeture ${
						ouraData.bodyTempeture
					}
			${ouraData.recoveryIndex < 70 ? '🥲' : '👍🏼'}   Recovery Index ${
						ouraData.recoveryIndex
					}
			${ouraData.sleepBalance < 70 ? '🥲' : '👍🏼'}   Sleep Balance ${
						ouraData.sleepBalance
					}
			`;
					bot.sendMessage(chatId, text);
				})
			)
			.catch((errors) => {
				console.log(errors);
			});
	},
	null,
	true,
	'America/Los_Angeles'
);

// job.start();

app.listen(PORT, (error) => {
	if (!error) console.log(`Runnin in port ${PORT}`);
	else console.log("Error occurred, server can't start", error);
});
