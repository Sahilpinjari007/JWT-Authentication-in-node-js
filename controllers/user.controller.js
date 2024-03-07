import { userModel } from "../models/user.model.js";
import asyncHandler from 'express-async-handler'
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import nodemailer from 'nodemailer'
import jwt from "jsonwebtoken"


const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await userModel.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

export const registerUser = asyncHandler(async (req, res) => {

    // get user details from frontend
    const { userName, email, password } = req.body;

    // validation - not empty
    if (userName.trim() === '' || email.trim() === '' || password.trim() === '') {
        throw new ApiError(400, "All fields are required!")
    }

    // check if user already exists: username, email
    const existedUser = await userModel.findOne({
        $or: [{ userName }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists!")
    }

    // create user object - create entry in db
    const user = await userModel.create({
        userName: userName.toLowerCase(),
        email,
        password
    });

    // remove password and refresh token field from response
    const createdUser = await userModel.findOne(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully!")
    )
})

export const loginUser = asyncHandler(async (req, res) => {

    // req body -> data
    const { userName, email, password } = req.body;

    // username or email
    if (!userName && !email) {
        throw new ApiError(400, 'All fields are requrid!');
    }

    //find the user
    const existedUser = await userModel.findOne({
        $or: [{ userName }, { email }]
    });

    if (!existedUser) throw new ApiError(404, "User does not exist!");

    //password check
    const isPasswordValid = await existedUser.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    //access and referesh token
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(existedUser._id)

    // remove passowd and refresh token from response
    const loggedInUser = await userModel.findById(existedUser._id).select("-password -refreshToken")

    //send cookie
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})

export const logout = asyncHandler(async (req, res) => {

    await userModel.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // it is remove refreshToken field from document
            }
        },
        {
            new: true
        }
    )


    const options = {
        httpOnly: true,
        secure: true
    }


    return res
        .status(200)
        .clearCookie('refreshToken', options)
        .clearCookie('accessToken', options)
        .json(new ApiResponse(200, {}, 'user logged out!'))

})

export const changePassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    if (oldPassword === newPassword) {
        throw new ApiError(401, 'previous password is same with new password!')
    }

    const user = await userModel.findById(req.user?._id);
    const isValidPassword = await user.isPasswordCorrect(oldPassword);

    if (!isValidPassword) {
        throw new ApiError(401, 'Invalid old password!');
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
})

export const forgetPassword = asyncHandler(async (req, res) => {

    const { email, phoneNumber } = req.body;


    if (!email && !phoneNumber) {
        throw new ApiError(401, 'All fileds requird!');
    }

    const otp = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

    try {
        if (email) {

            let transporter = nodemailer.createTransport({
                host: `${process.env.MAILE_HOSTER}`,
                port: `${process.env.MAILE_HOSTER_PORT}`,
                secure: false,
                auth: {
                    user: `${process.env.MAILE_HOST_USER}`,
                    pass: `${process.env.MAILE_HOST_PASS}`
                }
            });
        
            let mailOptions = {
                from: 'supportTeam@gmail.com',
                to: email,
                subject: 'Your OTP for reseting your password',
                html: `<!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
                    <title>Static Template</title>
                
                    <link
                      href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap"
                      rel="stylesheet"
                    />
                  </head>
                  <body
                    style="
                      margin: 0;
                      font-family: 'Poppins', sans-serif;
                      background: #ffffff;
                      font-size: 14px;
                    "
                  >
                    <div
                      style="
                        max-width: 680px;
                        margin: 0 auto;
                        padding: 45px 30px 60px;
                        background: #f4f7ff;
                        background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner);
                        background-repeat: no-repeat;
                        background-size: 800px 452px;
                        background-position: top center;
                        font-size: 14px;
                        color: #434343;
                      "
                    >
                      <header>
                        <table style="width: 100%;">
                          <tbody>
                            <tr style="height: 0;">
                              <td>
                                <img
                                  alt=""
                                  src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1663574980688_114990/archisketch-logo"
                                  height="30px"
                                />
                              </td>
                              <td style="text-align: right;">
                                <span
                                  style="font-size: 16px; line-height: 30px; color: #ffffff;"
                                  >12 Nov, 2021</span
                                >
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </header>
                
                      <main>
                        <div
                          style="
                            margin: 0;
                            margin-top: 70px;
                            padding: 92px 30px 115px;
                            background: #ffffff;
                            border-radius: 30px;
                            text-align: center;
                          "
                        >
                          <div style="width: 100%; max-width: 489px; margin: 0 auto;">
                            <h1
                              style="
                                margin: 0;
                                font-size: 24px;
                                font-weight: 500;
                                color: #1f1f1f;
                              "
                            >
                              Your OTP
                            </h1>
                            <p
                              style="
                                margin: 0;
                                margin-top: 17px;
                                font-size: 16px;
                                font-weight: 500;
                              "
                            >
                              Hey Tomy,
                            </p>
                            <p
                              style="
                                margin: 0;
                                margin-top: 17px;
                                font-weight: 500;
                                letter-spacing: 0.56px;
                              "
                            >
                              Thank you for choosing Archisketch Company. Use the following OTP
                              to complete the procedure to change your email address. OTP is
                              valid for
                              <span style="font-weight: 600; color: #1f1f1f;">5 minutes</span>.
                              Do not share this code with others, including Archisketch
                              employees.
                            </p>
                            <p
                              style="
                                margin: 0;
                                margin-top: 60px;
                                font-size: 40px;
                                font-weight: 600;
                                letter-spacing: 25px;
                                color: #ba3d4f;
                              "
                            >
                              ${otp}
                            </p>
                          </div>
                        </div>
                
                        <p
                          style="
                            max-width: 400px;
                            margin: 0 auto;
                            margin-top: 90px;
                            text-align: center;
                            font-weight: 500;
                            color: #8c8c8c;
                          "
                        >
                          Need help? Ask at
                          <a
                            href="mailto:archisketch@gmail.com"
                            style="color: #499fb6; text-decoration: none;"
                            >archisketch@gmail.com</a
                          >
                          or visit our
                          <a
                            href=""
                            target="_blank"
                            style="color: #499fb6; text-decoration: none;"
                            >Help Center</a
                          >
                        </p>
                      </main>
                
                      <footer
                        style="
                          width: 100%;
                          max-width: 490px;
                          margin: 20px auto 0;
                          text-align: center;
                          border-top: 1px solid #e6ebf1;
                        "
                      >
                        <p
                          style="
                            margin: 0;
                            margin-top: 40px;
                            font-size: 16px;
                            font-weight: 600;
                            color: #434343;
                          "
                        >
                          Archisketch Company
                        </p>
                        <p style="margin: 0; margin-top: 8px; color: #434343;">
                          Address 540, City, State.
                        </p>
                        <div style="margin: 0; margin-top: 16px;">
                          <a href="" target="_blank" style="display: inline-block;">
                            <img
                              width="36px"
                              alt="Facebook"
                              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661502815169_682499/email-template-icon-facebook"
                            />
                          </a>
                          <a
                            href=""
                            target="_blank"
                            style="display: inline-block; margin-left: 8px;"
                          >
                            <img
                              width="36px"
                              alt="Instagram"
                              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram"
                          /></a>
                          <a
                            href=""
                            target="_blank"
                            style="display: inline-block; margin-left: 8px;"
                          >
                            <img
                              width="36px"
                              alt="Twitter"
                              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503043040_372004/email-template-icon-twitter"
                            />
                          </a>
                          <a
                            href=""
                            target="_blank"
                            style="display: inline-block; margin-left: 8px;"
                          >
                            <img
                              width="36px"
                              alt="Youtube"
                              src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503195931_210869/email-template-icon-youtube"
                          /></a>
                        </div>
                        <p style="margin: 0; margin-top: 16px; color: #434343;">
                          Copyright © 2022 Company. All rights reserved.
                        </p>
                      </footer>
                    </div>
                  </body>
                </html>
                `
            }
        

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    throw new ApiError(401, 'Faild to Send OTP on Email')
                }
                else {
                    res.status(200).json(new ApiResponse(200, { otp }, 'OTP send successfuly!'))
                }
            })
        }
    }
    catch (error) {
        throw new ApiError(401, 'Faild to Send OTP on Email')
    }
})

export const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized Request");


    try {
        // decode refresh token
        const decodeToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await userModel.findById(decodeToken._id);

        // check user
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        // check refresh token expird or not
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, 'Refresh token is used or Expird!')
        }

        //send cookie
        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed!"
                )
            )

    }
    catch (error) {
        throw new ApiError(401, error?.message || 'Invalid Refresh Token!')
    }
})