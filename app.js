const express = require("express");
const cors = require("cors");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const moment = require("moment");
require("dotenv").config();

moment.locale("fr");

const app = express()

app.set('trust proxy', true)
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

var whitelist = ['https://mathisengels.fr', 'https://www.mathisengels.fr']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(null, false)
    }
 }
}
app.use(cors(corsOptions));

let transporterReady = false;
let transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    },
    tls: {
        ciphers: 'SSLv3'
    }
});

transporter.verify(function (error) {
    if (error) {
        console.log("Transporter error.");
        console.log(error);
    } else {
        console.log("Transporter ready.");
        transporterReady = true;
    }
});

const ban_ips = [];

app.post(
    "/message",
    body("email").optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body("message").isString().notEmpty().trim().escape(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).end();
        }
        body("message").run(req);

        const ip = req.header('x-forwarded-for');
        if (transporterReady && ban_ips.indexOf(ip) === -1) {
            var mail = {
                from: process.env.MAIL_FROM,
                to: process.env.MAIL_TO,
                subject: `Raoul - Nouveau message de ${ip}`,
                text: `${moment().format('DD/MM/YYYY, H:mm:ss')} - ${ip}  ` + req.body.message + req.body.email ? ` contact email : ${req.body.email}` : "",
                html: `
                <p>${moment().format('DD/MM/YYYY, H:mm:ss')} - ${ip}</p>
                <p>${req.body.message}</p>
                ${req.body.email ? `
                    <p>Contact : ${req.body.email}</p>
                    ` : ""
                    }`
            };

            try {
                await transporter.sendMail(mail);
            } catch {
                res.status(500).end();
            }

            return res.status(200).end();
        } else {
            return res.status(500).end();
        }
    }
);

app.listen(process.env.PORT, () => {
    console.log(`Server running on ${process.env.PORT}`);
})
