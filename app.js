const express = require("express");
const cors = require("cors");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const moment = require("moment");
require("dotenv").config();

moment.locale("fr");

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "http://localhost"
}));

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
    body("ip").isString().isLength({ min: 8, max: 16 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).end();
        }
        body("message").run(req);

        if (transporterReady && ban_ips.indexOf(req.body.ip) === -1) {
            var mail = {
                from: process.env.MAIL_FROM,
                to: process.env.MAIL_TO,
                subject: `Raoul - Nouveau message de ${req.body.ip}`,
                text: `${moment().format('DD/MM/YYYY, H:mm:ss')} - ${req.body.ip}  ` + req.body.message + req.body.email ? ` contact email : ${req.body.email}` : "",
                html: `
                <p>${moment().format('DD/MM/YYYY, H:mm:ss')} - ${req.body.ip}</p>
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
