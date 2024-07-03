const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto-js");
const jwt = require("jsonwebtoken");
const { sendMail, getHTML } = require("../libs/mailer");
const axios = require("axios");

const { JWT_SECRET, TOKEN_SECRET, FORGOT_PASSWORD_URL, FE_URL } = process.env;

const generateOTP = () => {
  const otp_number = Math.floor(100000 + Math.random() * 900000);
  const chipperOtp = crypto.AES.encrypt(
    otp_number.toString(),
    TOKEN_SECRET,
  ).toString();
  return { otp_number, chipperOtp };
};

const sendMailOTP = async (email, otp_number) => {
  const html = await getHTML("verification-email.ejs", { code: otp_number });
  await sendMail(email, "verify email", html);
};

const register = async (req, res, next) => {
  try {
    const { name, password, email, phone_number } = req.body;
    if (!name || !password || !email || !phone_number) {
      return res.status(400).json({
        status: false,
        message: "Semua kolom harus diisi",
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
            title: "Pendaftaran Berhasil",
            description: "Selamat, akun Anda telah berhasil dibuat",
            status: "unread",
          },
        },
      },
    });

    await sendMailOTP(email, otp_number.otp_number);
    delete users.otp_number;
    delete users.password;
    delete users.created_at;
    delete users.updated_at;
    res.status(200).json({
      status: true,
      message: "Pengguna berhasil didaftarkan",
      data: users,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({
        status: false,
        message: "Email atau nomor telepon sudah ada",
      });
    }

    next(error);
  }
};

const verify = async (req, res, next) => {
  try {
    const { email, otp_number } = req.body;
    const users = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    if (!users) {
      return res.status(400).json({
        status: false,
        message: "Pengguna tidak ditemukan",
      });
    }
    if (users.is_verified == true) {
      return res.status(200).json({
        status: true,
        message: "Pengguna sudah terverifikasi",
      });
    }

    const decryptedOtp = crypto.AES.decrypt(
      users.otp_number,
      TOKEN_SECRET,
    ).toString(crypto.enc.Utf8);

    if (decryptedOtp !== otp_number || decryptedOtp !== otp_number.toString()) {
      return res.status(400).json({
        status: false,
        message: "OTP tidak valid",
      });
    }

    const result = await prisma.users.update({
      where: {
        email,
      },
      data: {
        is_verified: true,
        otp_number: null,
        notifications: {
          create: {
            title: "Verifikasi Berhasil",
            description: "Akun Anda telah berhasil diverifikasi",
            status: "unread",
          },
        },
      },
    });

    res.status(200).json({
      status: true,
      message: "Pengguna berhasil diverifikasi",
      data: {
        is_verified: result.is_verified,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!password || !email) {
      return res.status(400).json({
        status: false,
        message: "Semua kolom harus diisi",
      });
    }

    const users = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    if (!users) {
      return res.status(400).json({
        status: false,
        message: "Pengguna tidak ditemukan",
      });
    }

    if (!users.password && users.is_google === true) {
      return res.status(400).json({
        status: false,
        message: "Silahkan login menggunakan google",
      });
    }

    const hashedPassword = crypto.SHA256(password).toString();

    if (users.password !== hashedPassword) {
      return res.status(400).json({
        status: false,
        message: "Password salah",
      });
    }

    delete users.otp_number;
    delete users.password;
    const token = jwt.sign({ ...users }, JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({
      status: true,
      message: "Pengguna berhasil login",
      data: {
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        status: false,
        message: "Email harus diisi dengan benar",
      });
    }

    const users = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    if (!users || !users.is_verified) {
      return res.status(400).json({
        status: false,
        message: "Pengguna tidak ditemukan atau belum diverifikasi",
      });
    }

    //create a unique string for reset password its was a email user and id encrypted with some secret key
    const resetPasswordToken = crypto.AES.encrypt(
      `${users.email}[|]${users.user_id}`,
      `${TOKEN_SECRET}`,
    ).toString();
    const link = `${FORGOT_PASSWORD_URL}?token=${resetPasswordToken}`;

    const html = await getHTML("forgot-password.ejs", { link });
    await sendMail(email, "Reset Password", html);
    return res.status(200).json({
      status: true,
      message: "Link reset password telah dikirimkan ke email Anda",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { password1, password2, token } = req.body;
    if (!password1 || !password2 || !token) {
      return res.status(400).json({
        status: false,
        message: "Password dan token diperlukan",
      });
    }

    const decryptToken = crypto.AES.decrypt(token, TOKEN_SECRET).toString(
      crypto.enc.Utf8,
    );
    const data = decryptToken.split("[|]");

    const email = data[0];

    if (data.length !== 2) {
      return res.status(400).json({
        status: false,
        message: "Token tidak valid",
        data: null,
      });
    }

    if (!password1 || password1.length < 1) {
      return res.status(400).json({
        status: false,
        message: "Password harus memiliki setidaknya 1 karakter",
        data: null,
      });
    }

    if (password1 !== password2) {
      return res.status(400).json({
        status: false,
        message: "Password tidak cocok",
        data: null,
      });
    }

    const hashedPassword = crypto.SHA256(password1).toString();
    await prisma.users.update({
      where: {
        email,
      },
      data: {
        password: hashedPassword,
      },
    });

    res.status(200).json({
      status: true,
      message: "Password berhasil diubah",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone_number } = req.body;
    const id = req.user.user_id;
    await prisma.users.update({
      where: {
        user_id: id,
      },
      data: {
        name,
        phone_number,
      },
    });

    await prisma.notifications.create({
      data: {
        title: "Profil Berhasil Diperbarui",
        description: `Semua perubahan pada profil Anda telah berhasil diperbarui`,
        user_id: req.user.user_id,
        status: "unread",
      },
    });

    res.status(200).json({
      status: true,
      message: "Profil berhasil diperbarui",
    });
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  const { old_password, new_password } = req.body;
  const id = req.user.user_id;

  try {
    const users = await prisma.users.findUnique({
      where: {
        user_id: id,
      },
    });

    if (!users) {
      return res.status(400).json({
        status: false,
        message: "Pengguna tidak ditemukan",
      });
    }

    const hashedOldPassword = crypto.SHA256(old_password).toString();

    if (users.password !== hashedOldPassword) {
      return res.status(400).json({
        status: false,
        message: "Password lama tidak valid",
      });
    }

    const hashedNewPassword = crypto.SHA256(new_password).toString();

    await prisma.users.update({
      where: {
        user_id: id,
      },
      data: {
        password: hashedNewPassword,
      },
    });

    await prisma.notifications.create({
      data: {
        title: "Password Berhasil Diperbarui",
        description: `Password Anda telah berhasil diperbarui`,
        user_id: req.user.user_id,
        status: "unread",
      },
    });

    res.status(200).json({
      status: true,
      message: "Password berhasil diperbarui",
    });
  } catch (error) {
    next(error);
  }
};

const newPassword = async (req, res, next) => {
  try {
    const { password1, password2 } = req.body;
    const id = req.user.user_id;

    const users = await prisma.users.findUnique({
      where: {
        user_id: id,
      },
    });

    if (!users) {
      return res.status(400).json({
        status: false,
        message: "Pengguna tidak ditemukan",
      });
    }

    if (password1 !== password2) {
      return res.status(400).json({
        status: false,
        message: "Password tidak cocok",
      });
    }

    const hashedNewPassword = crypto.SHA256(password2).toString();

    await prisma.users.update({
      where: {
        user_id: id,
      },
      data: {
        password: hashedNewPassword,
      },
    });

    await prisma.notifications.create({
      data: {
        title: "Password Berhasil Dibuat!",
        description: `Anda sudah berhasil membuat password`,
        user_id: req.user.user_id,
        status: "unread",
      },
    });

    res.status(200).json({
      status: true,
      message: "Password berhasil dibuat",
    });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const id = req.user.user_id;
    const users = await prisma.users.findUnique({
      where: {
        user_id: id,
      },
      select: {
        name: true,
        email: true,
        phone_number: true,
        is_google: true,
        password: true,
      },
    });

    let isPasswordExist;
    if (
      (!users.password && users.is_google) ||
      (users.password === "" && users.is_google === true)
    ) {
      isPasswordExist = false;
    }else {
        isPasswordExist = true
    }

    delete users.password

    res.status(200).json({
      status: true,
      data: { ...users, isPasswordExist },
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  const email = req.params.email;

  try {
    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    }

    const userId = user.user_id;

    await prisma.$transaction(async (prisma) => {
      // Delete related passengers and orderers
      const orderer = await prisma.orderers.findUnique({
        where: {
          user_id: userId,
        },
      });

      if (orderer) {
        await prisma.passengers.deleteMany({
          where: {
            orderer_id: orderer.orderer_id,
          },
        });

        await prisma.orderers.delete({
          where: {
            orderer_id: orderer.orderer_id,
          },
        });
      }

      // Find all related transactions
      const transactions = await prisma.transactions.findMany({
        where: {
          user_id: userId,
        },
      });

      // Delete transactions and related tickets
      for (const transaction of transactions) {
        await prisma.transactions.delete({
          where: {
            transaction_id: transaction.transaction_id,
          },
        });

        await prisma.tickets.delete({
          where: {
            ticket_id: transaction.ticket_id,
          },
        });
      }

      // Delete all related notifications
      await prisma.notifications.deleteMany({
        where: {
          user_id: userId,
        },
      });

      // Delete the user
      await prisma.users.delete({
        where: {
          user_id: userId,
        },
      });
    });

    res
      .status(200)
      .json({ message: "Pengguna dan data terkait berhasil dihapus" });
  } catch (error) {
    next(error);
  }
};

const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        status: false,
        message: "Email harus diisi dengan benar",
        data: null,
      });
    }

    const isExisted = await prisma.users.findUnique({where: {email}})
    if(!isExisted){
      return res.status(400).json({
        status: false,
        message: 'Tidak ada user yang menggunakan email ini!',
        data: null
      })
    }

    const { otp_number, chipperOtp } = generateOTP();
    const updated = await prisma.users.update({
      data: {
        otp_number: chipperOtp,
      },
      where: {
        email,
      },
    });

    if (!updated) {
      return res.status(400).json({
        status: false,
        message: "Gagal memperbarui",
        data: null,
      });
    }

    await sendMailOTP(email, otp_number);

    return res.status(200).json({
      status: true,
      message: "OTP berhasil diperbarui",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

const whoami = async (req, res, next) => {
  try {
    res.status(200).json({
      status: true,
      message: "OK",
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

const googleOauth2 = async (req, res) => {
  const { access_token } = req.body;
  try {
    try {
      let { data } = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      );

      const { email, name } = data;
      let user = await prisma.users.upsert({
        where: { email: email },
        update: { is_google: true },
        create: {
          name: name,
          is_verified: true,
          email: email,
          is_google: true,
        },
      });

      delete user.otp_number;
      delete user.password;
      const tokenJWT = jwt.sign({ ...user }, JWT_SECRET, { expiresIn: "1h" });

      return res.status(200).json({
        status: true,
        message: "Login berhasil",
        tokenJWT: tokenJWT,
        data: user,
      });
    } catch (error) {
      throw new Error("Failed to fetch user info");
    }
  } catch (error) {
    throw new Error("Something was wrong, please wait a moment");
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const passcode = req.params.passcode

    if(passcode !== process.env.PASSCODE){
      return res.status(403).json({
        status: false,
        message: 'Unauthorized'
      })
    }

    const allUsers = await prisma.users.findMany({
      select: {
        email: true,
        is_verified: true,
        is_google: true
      }
    })

    if(!allUsers){
      return res.status(400).json({
        status: false,
        message: 'Tidak ada user pada database'
      })
    }

    res.status(200).json({
      status: true,
      message: 'Berhasil mendapatkan users',
      data: allUsers
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  whoami,
  register,
  verify,
  login,
  forgotPassword,
  changePassword,
  updateProfile,
  updatePassword,
  getProfile,
  deleteUser,
  resendOTP,
  googleOauth2,
  newPassword,
  getAllUsers
};
