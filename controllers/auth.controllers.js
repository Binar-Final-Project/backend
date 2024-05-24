const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto-js');
const jwt = require('jsonwebtoken');
const { sendMail, getHTML } = require('../libs/mailer');

const { JWT_SECRET, TOKEN_SECRET, FORGOT_PASSWORD_URL } = process.env;

const generateOTP = () => {
    const otp= Math.floor(100000 + Math.random() * 900000);
    const chipperOtp = crypto.AES.encrypt(otp.toString(), TOKEN_SECRET).toString();
    return { otp, chipperOtp };
}

const sendMailOTP = async (email, otp) => {
    const html = await getHTML('verification-email.ejs', { code: otp });
    await sendMail(email, 'verify email', html);
}

const register = async (req, res, next) => {
    try {
        const { name, password, email, phone_number } = req.body;
        const hashedPassword = crypto.SHA256(password).toString();
        const otp = generateOTP();
        
        //otp expired in 5 minutes using  ISO-8601 DateTime string
        const expired = new Date(new Date().getTime() + 5 * 60000).toISOString();

        const user = await prisma.user.create({
            data: {
                name,
                password: hashedPassword,
                email: email,
                otp: otp.chipperOtp,
                otpExpiry: expired,
                phone_number: phone_number
            }
        });

        await sendMailOTP(email, otp.otp);

        res.json({
            status: true,
            message: 'User registered!',
            data: user
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
        const { email, otp } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if (!user) {
            return res.status(400).json({
                status: false,
                message: 'User not found'
            });
        }

        if (new Date(user.otpExpiry) < new Date()) {
            const newOtp = generateOTP();
            await prisma.user.update({
                where: {
                    email
                },
                data: {
                    otp: newOtp.chipperOtp,
                    otpExpiry: new Date(new Date().getTime() + 5 * 60000).toISOString()
                }
            });

            await sendMailOTP(email, newOtp.otp);

            return res.status(400).json({
                status: false,
                message: 'OTP expired, new OTP will be sent to your email'
            });
        }

        const decryptedOtp = crypto.AES.decrypt(user.otp, TOKEN_SECRET).toString(crypto.enc.Utf8);
        
        if (decryptedOtp !== otp || decryptedOtp !== otp.toString()) {
            return res.status(400).json({
                status: false,
                message: 'Invalid OTP'
            });
        }

        await prisma.user.update({
            where:{
                email
            },
            data:{
                verified:true,
                otp:null,
                otpExpiry:null
            }
        });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

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
        
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if (!user) {
            return res.status(400).json({
                status: false,
                message: 'User not found'
            });
        }

        const hashedPassword = crypto.SHA256(password).toString();

        if (user.password !== hashedPassword) {
            return res.status(400).json({
                status: false,
                message: 'Invalid password'
            });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

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
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if (!user || !user.verified) {
            return res.status(400).json({
                status: false,
                message: 'User not found or not verified'
            });
        }

        //create a unique string for reset password its was a email user and id encrypted with some secret key
        const resetPasswordToken = crypto.AES.encrypt(`${user.email}[|]${user.id}`, `${TOKEN_SECRET}`).toString();
        const link = `${FORGOT_PASSWORD_URL}?token=${resetPasswordToken}&email=${user.email}`
        
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
        await prisma.user.update({
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
        const { id } = req.user;
        await prisma.user.update({
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
    const { id } = req.user;

    try {
        const user = await prisma.user.findUnique({
            where: {
                id
            }
        });

        if (!user) {
            return res.status(400).json({
                status: false,
                message: 'User not found'
            });
        }

        const hashedOldPassword = crypto.SHA256(oldPassword).toString();

        if (user.password !== hashedOldPassword) {
            return res.status(400).json({
                status: false,
                message: 'Invalid old password'
            });
        }

        const hashedNewPassword = crypto.SHA256(newPassword).toString();

        await prisma.user.update({
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
        const user = await prisma.user.findUnique({
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
            data: user
        });
    } catch (error) {
        next(error);
    }
}

module.exports = { register, verify, login, forgotPassword, changePassword, updateProfile, updatePassword, getProfile};