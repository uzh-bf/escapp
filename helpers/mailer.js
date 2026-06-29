const nodemailer = require("nodemailer");

const getSmtpPort = () => parseInt(process.env.SMTP_PORT || "465", 10);

const isSmtpSecure = () => {
    if (process.env.SMTP_SECURE === undefined) {
        return getSmtpPort() === 465;
    }

    return process.env.SMTP_SECURE === "true";
};

const getTransporter = () => nodemailer.createTransport({
    "host": process.env.SMTP_HOST || "smtp.resend.com",
    "port": getSmtpPort(),
    "secure": isSmtpSecure(),
    "auth": {
        "user": process.env.SMTP_USERNAME || "resend",
        "pass": process.env.SMTP_PASSWORD
    }
});

exports.resetPasswordEmail = (to, subject = "escapp", text, html) => {
    const from = process.env.SMTP_FROM || `noreply@${process.env.APP_NAME || "escapp.dit.upm.es"}`;
    const msg = {
        to,
        from,
        subject,
        text,
        html
    };

    return getTransporter().sendMail(msg);
};
