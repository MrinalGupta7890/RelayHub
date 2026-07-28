import { Request, Response } from "express";
import { RegisterUserUseCase } from "../../../application/use-cases/auth/RegisterUserUseCase";
import { LoginUserUseCase } from "../../../application/use-cases/auth/LoginUserUseCase";
import { RefreshSessionUseCase } from "../../../application/use-cases/auth/RefreshSessionUseCase";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUserUseCase,
    private readonly refreshUseCase: RefreshSessionUseCase
  ) {}

  register = async (req: Request, res: Response) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      const user = await this.registerUseCase.execute({ email, passwordRaw: password, name });
      res.status(201).json({ id: user.id, email: user.email, name: user.name });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: e.errors });
      } else {
        res.status(400).json({ error: e.message });
      }
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await this.loginUseCase.execute({ email, passwordRaw: password });
      
      // Set refresh token in httpOnly cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.status(200).json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: e.errors });
      } else {
        res.status(401).json({ error: e.message });
      }
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new Error("No refresh token provided");
      }
      
      // We look up the session by token hash in the UseCase
      const result = await this.refreshUseCase.execute({ refreshToken });
      
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ accessToken: result.accessToken });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  };

  logout = async (_req: Request, res: Response) => {
    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logged out" });
  };
}
