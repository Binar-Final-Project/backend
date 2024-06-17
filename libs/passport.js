const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;


passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL
},

async function (accessToken, refreshToken, profile, done) {
    try {
        let user = await prisma.users.upsert({
            where: { email: profile.emails[0].value },
            update: { google_id: profile.id },
            create: {
                name: profile.displayName,
                is_verified: true,
                email: profile.emails[0].value,
                google_id: profile.id
            }
        });

        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.users.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
    
module.exports = passport;