//create middleware for route protection, using jwt
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({
            status: false,
            message: 'Unauthorized'
        });
    }
    const bearer = token.split(' ')[1];

    jwt.verify(bearer, JWT_SECRET, (err, data) => {
        if (err) {
            return res.status(401).json({
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
        
        req.user = data;
        next();
    });
}

module.exports = { verifyToken };