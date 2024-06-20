//create middleware for route protection, using jwt
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(403).json({
            status: false,
            message: 'Unauthorized'
        });
    }
    const bearer = token.split(' ')[1];

    jwt.verify(bearer, JWT_SECRET, async (err, data) => {
        if (err) {
            return res.status(403).json({
                status: false,
                message: 'Unauthorized'
            });
        }
        delete data.iat
        delete data.exp

        if (data.user) {
            Object.assign(data, data.user);
            delete data.user; // Hapus objek user setelah memindahkan propertinya
        }

        const user = await prisma.users.findUnique({where: {user_id: data.user_id}})
        if(!user){
            return res.status(403).json({
                status: false,
                message: 'Unauthorized'
            });
        }
        
        delete user.password
        delete user.otp_number

        req.user = user;
        next();
    });
}

module.exports = { verifyToken };