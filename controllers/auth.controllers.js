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
        if(!name || !password || !email || !phone_number){
            return res.status(400).json({
                status: false,
                message: 'All fields are required!',
            });
        }
        const hashedPassword = crypto.SHA256(password).toString();
        const otp_number = generateOTP();
        
        const users = await prisma.users.create({
            data: {
                name,
                password: hashedPassword,
                email: email,
                otp_number: otp_number.chipperOtp,
                phone_number: phone_number,
                notifications: {
                    create: {
                        title: 'Registration Success',
                        description: 'Congratulations, your account has been successfully created!',
                        status: 'unread'
                    }
                }
            }
        });

        await sendMailOTP(email, otp_number.otp_number);
        delete users.otp_number
        delete users.password
        delete users.created_at 
        delete users.updated_at
        res.status(200).json({
            status: true,
            message: 'User registered!',
            data: users
        });
    } catch (error) {

        if (error.code === 'P2002') {
            return res.status(400).json({
                status: false,
                message: 'Email or phone number already exists',
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
         if (users.is_verified == true) {
            return res.status(200).json({
                status: true,
                message: 'User verified'
             });
        }

        const decryptedOtp = crypto.AES.decrypt(users.otp_number, TOKEN_SECRET).toString(crypto.enc.Utf8);
        
        if (decryptedOtp !== otp_number || decryptedOtp !== otp_number.toString()) {
            return res.status(400).json({
                status: false,
                message: 'Invalid OTP'
            });
        }

        const result = await prisma.users.update({
            where:{
                email
            },
            data:{
                is_verified:true,
                otp_number:null,
                notifications: {
                    create: {
                        title: 'Verification Success',
                        description: 'Your account has successfully verified!',
                        status: 'unread'
                    }
                }
            }
        });

        res.json({
            status: true,
            message: 'User verified!',
            data: {
                is_verified: result.is_verified
            }
        });
    } catch (error) {
        next(error);
    }
}

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if(!password || !email ){
            return res.status(400).json({
                status: false,
                message: 'All fields are required!',
            });
        }
        
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

        const token = jwt.sign({ id: users.user_id }, JWT_SECRET, { expiresIn: '1h' });

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
        if(!email){
            return res.status(400).json({
                status: false,
                message: 'Email not sent',
            });
        }
        
        const users = await prisma.users.findUnique({
            where: {
                email
            }
        });

        if (!users || !users.is_verified) {
            return res.status(400).json({
                status: false,
                message: 'User not found or not verified'
            });
        }

        //create a unique string for reset password its was a email user and id encrypted with some secret key
        const resetPasswordToken = crypto.AES.encrypt(`${users.email}[|]${users.user_id}`, `${TOKEN_SECRET}`).toString();
        const link = `${FORGOT_PASSWORD_URL}?token=${resetPasswordToken}`
        
        const html = await getHTML('forgot-password.ejs', { link });
        await sendMail(email, 'Reset Password', html);
        return res.json({
            status: true,
            message: 'Reset password link sent to your email',
            data: null
        });
    } catch (error) {
        next(error);
    }
}

const changePassword = async (req, res, next) => {
    try {
        const { password1, password2, token } = req.body;
        if(!password1 || !password2 || !token){
            return res.status(400).json({
                status: false,
                message: 'Password or token not sent',
            });
        }s
        const decryptToken = crypto.AES.decrypt(token, TOKEN_SECRET).toString(crypto.enc.Utf8);
        const data = decryptToken.split('[|]');

        const email = data[0]

        if (data.length !== 2) {
            return res.status(400).json({
                status: false,
                message: 'Invalid token',
                data: null
            });
        }

        if(!password1 || password1.length < 1){
            return res.status(400).json({
                status: false,
                message: 'Password must be at least 1 characters',
                data: null
            });
        }

        if(password1 !== password2){
            return res.status(400).json({
                status: false,
                message: 'Password do not match',
                data: null
            });
        }

        const hashedPassword = crypto.SHA256(password1).toString();
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
            message: 'Password changed successfully',
            data: null
        });
    }catch(error){
        next(error)
    }
}

const updateProfile = async (req, res, next) => {
    try {
        const { name, phone_number } = req.body;
        const { id } = req.user;
        await prisma.users.update({
            where: {
                user_id: id
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
    const { id } = req.user



    try {
        const users = await prisma.users.findUnique({
            where: {
                user_id: id
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
                user_id: id
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
                user_id: id
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

const deleteAllUsers = async (req,res, next) => {
    try {
        await prisma.notifications.deleteMany()
        await prisma.users.deleteMany()

        res.status(200).json({
            status: true,
            message: 'Users deleted'
        })
    } catch (err) {
        next(err)
    }
}

const resendOTP = async (req,res,next) => {
    try {
        const {email} = req.body
        if(!email){
            return res.status(400).json({
                status: false,
                message: 'Email not sent',
                data: null
            })
        }

        const {otp_number, chipperOtp} = generateOTP()
        const updated = await prisma.users.update({
            data: {
                otp_number: chipperOtp
            },
            where: {
                email
            }
        })

        if(!updated){
            return res.status(400).json({
                status: false,
                message: 'failed to updated',
                data: null
            })
        }

        await sendMailOTP(email, otp_number)

        return res.status(200).json({
            status: true,
            message: 'OTP UPDATED!',
            data: null
        })
    } catch (err) {
        next(err)
    }
}

module.exports = { register, verify, login, forgotPassword, changePassword, updateProfile, updatePassword, getProfile, deleteAllUsers, resendOTP};