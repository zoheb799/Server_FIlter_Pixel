import { Request, Response, NextFunction } from 'express';
import { User } from "../models/User";
import jwt from "jsonwebtoken";

// Define the request interface to include the user property
interface IRequest extends Request {
  user?: any; // Change `any` to the appropriate user type if needed
}

export const isAuthenticated = async (req: IRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Login to access this resource",
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { _id: string };

    // Find the user based on the decoded _id
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach the user to the request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
