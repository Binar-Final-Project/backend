const mailer = require('nodemailer');
const { GOOGLE_SENDER_EMAIL, GOOGLE_SENDER_PASSWORD, GOOGLE_USERNAME } = process.env;
let ejs = require('ejs');

const transporter = mailer.createTransport({
    service: 'gmail',
    auth: {
        user: GOOGLE_USERNAME,
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

module.exports = { sendMail, getHTML };