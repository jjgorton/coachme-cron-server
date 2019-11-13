require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const axios = require("axios");
const cron = require("node-cron");
const moment = require("moment-timezone");
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const requestOptions = {
  headers: { accept: "application/json" }
};

// sets cron server to check the scheduledMessages table through the
// /twilioRoute/getAllScheduledMessages endpoint.
// pulls data every minute.
cron.schedule(`*/1 * * * *`, function() {
  console.log("-----------------");
  console.log("A minute in cron land as passed!!!!");
  axios
    .get(
      `${process.env.BACKEND_URL}/twilioRoute/getAllScheduledMessages`,
      requestOptions
    )
    .then(results => {
      // Loops through all of the records in the scheduledMessages table.
      for (let i = 0; i < results.data.data.length; i++) {
        // Logic that tells the scheduler whether the message should be sent monthly
        // or weekly. Empty month string means that the message should be sent weekly.
        if (results.data.data[i].month === "") {
          // converts the values from the scheduledMessages table to Tuesday,6:06pm
          // so that we can use moment to check if the message should be sent.
          if (
            `${results.data.data[i].weekday},${results.data.data[i].hour}:${results.data.data[i].min}${results.data.data[i].ampm}` ===
            moment()
              .tz("America/Los_Angeles")
              .format("dddd,h:mma")
          ) {
            // reformats the number in the airtable from (509) 760-9090 to
            // 5097609090
            const cleanedNumber = results.data.data[i].userPhone.replace(
              /(\d{3})(\d{3})(\d{4})/,
              "($1) $2-$3"
            );
            client.messages
              .create({
                body: results.data.data[i].msg,
                from: `${process.env.TWILIO_NUMBER}`,
                to: `+1${cleanedNumber}`
              })
              .then(message => console.log(`message sent ${message.sid}.`))
              .catch(err => console.log(error, err));
          } else {
            console.log("no messages scheduled at this time.");
          }
        } else {
          // logic for the messages that are scheduled to be sent monthly.
          // converts the values from the scheduledMessages table into
          // 11 13, 2019 4:05 PM so that we can use moment to check whether the
          // message should be sent.
          if (
            `${results.data.data[i].month} ${results.data.data[i].dom}, ${
              results.data.data[i].year
            } ${results.data.data[i].hour}:${
              results.data.data[i].min
            } ${results.data.data[i].ampm.toUpperCase()}` ===
            moment().format("lll")
          ) {
            // reformats the number in the airtable from (509) 760-9090 to
            // 5097609090
            const cleanedNumber = results.data.data[i].userPhone.replace(
              /(\d{3})(\d{3})(\d{4})/,
              "($1) $2-$3"
            );
            client.messages
              .create({
                body: results.data.data[i].msg,
                from: `${process.env.TWILIO_NUMBER}`,
                to: `+1${cleanedNumber}`
              })
              .then(message => console.log(`message sent ${message.sid}.`))
              .catch(err => console.log(error, err));
          } else {
            console.log("no messages scheduled at this time.");
          }
        }
      }
    })
    .catch(err => {
      console.log(err);
    });
});

const server = express();

server.use(helmet());
server.use(express.json());
server.use(cors());

// Used to check if the server is pulling in data from the main server.
server.get("/newRoute", (req, res) => {
  axios
    .get(
      `${process.env.BACKEND_URL}/twilioRoute/getAllScheduledMessages`,
      requestOptions
    )
    .then(results => {
      res.status(200).json({ message: "hello there!!!", data: results.data });
    })
    .catch(err => {
      res
        .status(500)
        .json({ message: "this is also not working!", error: err });
    });
});

server.listen(process.env.PORT, () => {
  console.log(`Listening to port: ${process.env.PORT}`);
});

// {
// 	"patientId": "recmLlbDsUaCMUFhf",
// 	"scheduleDate": "july 22nd",
//     "msg": "hello mason from the past!!!",
//     "min": "09",
//     "hour": "4",
//     "weekday": "Monday"
// }
