const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto-js');
const jwt = require('jsonwebtoken');
const { sendMail, getHTML } = require('../libs/mailer');

const { JWT_SECRET, TOKEN_SECRET, FORGOT_PASSWORD_URL } = process.env;

const generateOTP = () => {
    const otp_number= Math.floor(100000 + Math.random() * 900000);
    const chipperOtp = crypto.AES.encrypt(otp_number.toString(), TOKEN_SECRET).toString();
    return { otp_number, chipperOtp };
}

const sendMailOTP = async (email, otp_number) => {
    const html = await getHTML('verification-email.ejs', { code: otp_number });
    await sendMail(email, 'verify email', html);
}

const register = async (req, res, next) => {
    try {
        const { name, password, email, phone_number } = req.body;
        const hashedPassword = crypto.SHA256(password).toString();
        const otp_number = generateOTP();
        
        const users = await prisma.users.create({
            data: {
                name,
                password: hashedPassword,
                email: email,
                otp_number: otp_number.chipperOtp,
                phone_number: phone_number
            }
        });

        await sendMailOTP(email, otp_number.otp_number);
        delete users.otp_number;
        res.json({
            status: true,
            message: 'User registered!',
            data: users
        });
    } catch (error) {

        if (error.code === 'P2002') {
            return res.status(400).json({
                status: false,
                message: 'Email or phone number already exists'
            });
        }

        next(error);
    }
}

const verify = async (req, res, next) => {
    try {
        const { email, otp_number } = req.body;
        const users = await prisma.users.findUnique({
            where: {
                email
            }
        });

        if (!users) {
            return res.status(400).json({
                status: false,
                message: 'User not found'
            });
        }

        const decryptedOtp = crypto.AES.decrypt(users.otp_number, TOKEN_SECRET).toString(crypto.enc.Utf8);
        
        if (decryptedOtp !== otp_number || decryptedOtp !== otp_number.toString()) {
            return res.status(400).json({
                status: false,
                message: 'Invalid OTP'
            });
        }

        await prisma.users.update({
            where:{
                email
            },
            data:{
                is_verified:true,
                otp_number:null,
            }
        });

        const token = jwt.sign({ id: users.id }, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            status: true,
            message: 'User verified!',
            data: {
                token
            }
        });
    } catch (error) {
        next(error);
    }
}

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        const users = await prisma.users.findUnique({
            where: {
                email
            }
        });

        if (!users) {
            return res.status(400).json({
                status: false,
                message: 'User not found'
            });
        }

        const hashedPassword = crypto.SHA256(password).toString();

        if (users.password !== hashedPassword) {
            return res.status(400).json({
                status: false,
                message: 'Invalid password'
            });
        }

        const token = jwt.sign({ id: users.id }, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            status: true,
            message: 'User logged in!',
            data: {
                token
            }
        });

    } catch (error) {
        next(error);
    }

}

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const users = await prisma.users.findUnique({
            where: {
                email
            }
        });

        if (!users || !users.verified) {
            return res.status(400).json({
                status: false,
                message: 'User not found or not verified'
            });
        }

        //create a unique string for reset password its was a email user and id encrypted with some secret key
        const resetPasswordToken = crypto.AES.encrypt(`${users.email}[|]${users.id}`, `${TOKEN_SECRET}`).toString();
        const link = `${FORGOT_PASSWORD_URL}?token=${resetPasswordToken}&email=${users.email}`
        
        const html = await getHTML('forgot-password.ejs', { link });
        await sendMail(email, 'Reset Password', html);
        return res.json({
            status: true,
            message: 'Reset password link sent to your email'
        });
    } catch (error) {
        next(error);
    }
}

const changePassword = async (req, res, next) => {
    try {
        const { email, password, token } = req.body;
        const decryptToken = crypto.AES.decrypt(token, TOKEN_SECRET).toString(crypto.enc.Utf8);
        const data = decryptToken.split('[|]');

        if (data.length !== 2) {
            return res.status(400).json({
                status: false,
                message: 'Invalid token'
            });
        }

        if (data[0] !== email) {
            return res.status(400).json({
                status: false,
                message: 'Invalid email'
            });
        }

        if(!password || password.length < 1){
            return res.status(400).json({
                status: false,
                message: 'Password must be at least 1 characters'
            });
        }

        const hashedPassword = crypto.SHA256(password).toString();
        await prisma.users.update({
            where: {
                email
            },
            data: {
                password: hashedPassword
            }
        });

        res.json({
            status: true,
            message: 'Password changed successfully'
        });
    }catch(error){
        next(error)
    }
}

const updateProfile = async (req, res, next) => {
    try {
        const { name, phone_number } = req.body;
        const { id } = req.users;
        await prisma.users.update({
            where: {
                id
            },
            data: {
                name,
                phone_number
            }
        });

        res.json({
            status: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        next(error);
    }
}

const updatePassword = async(req, res, next) =>{
    const { oldPassword, newPassword } =  req.body;
    const { id } = req.users

    try {
        const users = await prisma.users.findUnique({
            where: {
                id
            }
        });

        if (!users) {
            return res.status(400).json({
                status: false,
                message: 'User not found'
            });
        }

        const hashedOldPassword = crypto.SHA256(oldPassword).toString();

        if (users.password !== hashedOldPassword) {
            return res.status(400).json({
                status: false,
                message: 'Invalid old password'
            });
        }

        const hashedNewPassword = crypto.SHA256(newPassword).toString();

        await prisma.users.update({
            where: {
                id
            },
            data: {
                password: hashedNewPassword
            }
        });

        res.json({
            status: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        next(error);
    }
}

const getProfile = async (req, res, next) => {
    try {
        const { id } = req.user;
        const users = await prisma.users.findUnique({
            where: {
                id
            },
            select: {
                name: true,
                email: true,
                phone_number: true
            }
        });

        res.json({
            status: true,
            data: users
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { register, verify, login, forgotPassword, changePassword, updateProfile, updatePassword, getProfile};