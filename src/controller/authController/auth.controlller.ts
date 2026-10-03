require("dotenv").config();
import { Request, Response } from "express";
import { prisma } from "../../config/database";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import z from "zod";

export const signUp = async (req: Request, res: Response) => {
 
  try {
    const schema = z.object({
      userName: z.string().min(4, "Name is required"),
      userEmail: z.string().email("Invalid Email"),
      userPassword: z.string().min(8, "Password must be 8 characters"),
      userAvtar: z.string().url("Invalid avtar url"),
      userRegistrationNumber: z
        .string()
        .length(10, "Registration number must be exactly 10 characters"),
    });

    const result = schema.safeParse(req.body);
   
    if (!result.success) {
      res.status(400).json({
        message: "Invalid input",
        error: result.error.format(),
      });
      return;
    }

    const {
      userName,
      userEmail,
      userPassword,
      userAvtar,
      userRegistrationNumber,
    } = result.data;

    const isUserExist = await prisma.user.findFirst({
      where: {
        userEmail,
        userRegistrationNumber,
      },
    });
    if (isUserExist) {
      res.status(409).json({
        message: "User already exists !",
      });
      return;
    }
    const hashedPassword = await bcryptjs.hash(userPassword, 10);

    const user = await prisma.user.create({
      data: {
        userName,
        userEmail,
        userPassword: hashedPassword,
        userAvtar,
        userRegistrationNumber,
      },
    });
    if (!user) {
      res.status(500).json({
        message: "Failed to signup",
      });
      return;
    }
    console.log(process.env.JWT_SECRET);
    const token = jwt.sign(
      { userEmail: user.userEmail, userRole: user.userRole },
      process.env.JWT_SECRET ||
        "oquhejceuiscgihnieivriguotruichugihueihgi626454995959x59f5er9f59g9r4b9w494br9t",
      { expiresIn: "30days" }
    );

    res.status(200).json({
      message: `${user.userName} signed up`,
      token: token,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: `${err.message}`,
    });
  }
};

export const signIn = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userEmail: z.string().email("Invalid email"),
      userPassword: z.string().min(8, "Password must be 8 characters"),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        messsage: "Invalid input",
        error: result.error.flatten(),
      });
      return;
    }
    const { userEmail, userPassword } = result.data;

    const isUserExist = await prisma.user.findUnique({
      where: { userEmail },
    });
    if (!isUserExist) {
      res.status(404).json({
        message: "No user found try signing up",
      });
      return;
    }
    const validPassword = await bcryptjs.compare(
      userPassword,
      isUserExist.userPassword
    );
    if (!validPassword) {
      res.status(401).json({
        message: "Incorrect password",
      });
      return;
    }
    console.log("signin")
    console.log(process.env.JWT_SECRET)
    const token = jwt.sign(
      { userEmail: isUserExist.userEmail, userRole: isUserExist.userRole },
      process.env.JWT_SECRET ||
        "oquhejceuiscgihnieivriguotruichugihueihgi626454995959x59f5er9f59g9r4b9w494br9t",
      { expiresIn: "30days" }
    );
    res.status(200).json({
      message: `${isUserExist.userName} signed in successfully`,
      token: token,
      user: {
        userId: isUserExist.userId,
        userName: isUserExist.userName,
        userEmail: isUserExist.userEmail,
        userAvtar: isUserExist.userAvtar,
        userRole: isUserExist.userRole,
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: `${err.message}`,
    });
  }
};
