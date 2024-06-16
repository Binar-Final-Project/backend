const mailer = require('nodemailer');
const { GOOGLE_SENDER_EMAIL, GOOGLE_SENDER_PASSWORD } = process.env;
let ejs = require('ejs');

const transporter = mailer.createTransport({
    service: 'gmail',
    auth: {
        user: GOOGLE_SENDER_EMAIL,
        pass: GOOGLE_SENDER_PASSWORD
    }
});

const sendMail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: GOOGLE_SENDER_EMAIL,
            to,
            subject,
            html
        });
        return info;
    } catch (error) {
        throw error;
    }
}

const sendTicket = async (to, pdf, filename) => {
    try {
        await transporter.sendMail({
            from: GOOGLE_SENDER_EMAIL,
            to,
            subject: 'Your E-ticket',
            text: 'Please find your e-ticket attached',
            attachments: [
                {
                    filename,
                    content: pdf,
                    contentType: 'application/pdf'
                }
            ]
        })
    } catch (err) {
        throw error
    }
}

const getHTML = (fileName, data) => {
    return new Promise((resolve, reject) => {
        const path = `${__dirname}/../views/${fileName}`;
        ejs.renderFile(path, data, (err, data) => {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        });
    });
}

module.exports = { sendMail, getHTML, sendTicket };