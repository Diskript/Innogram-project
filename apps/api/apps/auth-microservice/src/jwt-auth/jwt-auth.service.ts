import { ConflictException, Injectable } from "@nestjs/common";
import {
  comparePassword,
  hashingFunction,
  LoginDto,
  RefreshTokenDto,
  SignUpDto,
} from "@repo/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly coreServiceUrl: string;

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key-here";
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "15m";
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
    this.coreServiceUrl =
      process.env.CORE_SERVICE_URL || "http://localhost:3001";
  }

  async registerUser(_signUpDto: SignUpDto) {
    // Check if user with this email already exists
    const existingAccount = await this.prismaService.client.account.findUnique({
      where: { email: _signUpDto.email },
    });

    if (existingAccount) {
      throw new ConflictException("User with this email already exists");
    }

    // Check if username is already taken
    const existingUser = await this.prismaService.client.user.findUnique({
      where: { userName: _signUpDto.username },
    });

    if (existingUser) {
      throw new ConflictException("Username is already taken");
    }

    // Hash the password
    const passwordHash = await hashingFunction(_signUpDto.password);

    // Create user and account in a transaction
    const result = await this.prismaService.client.$transaction(
      async (prisma) => {
        // Create the user
        const user = await prisma.user.create({
          data: {
            userName: _signUpDto.username,
            displayName: _signUpDto.displayName,
            birthday: new Date(_signUpDto.birthday),
            bio: _signUpDto.bio || "",
            avatarUrl: "",
            isPublic: true,
          },
        });

        // Create the account
        await prisma.account.create({
          data: {
            userId: user.id,
            email: _signUpDto.email,
            passwordHash: passwordHash,
            provider: "LOCAL",
            providerId: user.id,
            last_login_at: new Date(),
          },
        });

        return user;
      },
    );

    return {
      message: "User registered successfully",
      userId: result.id,
    };
  }

  async authenticateUser(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const existingAccount = await this.prismaService.client.account.findUnique({
      where: { email: email },
    });

    if (!existingAccount) {
      throw new ConflictException("Accout not found");
    }

    const isValidPassword = await comparePassword(
      password,
      existingAccount.passwordHash,
    );

    if (isValidPassword) {
      return {
        message: "Authenticated seccessfully",
        userId: existingAccount.userId,
      };
    }
  }

  // async processRefreshToken(oldRefreshTokenId: RefreshTokenDto) {
  // TODO: Implement refresh token processing logic
  // throw new Error();
  // }

  // async validateToken(accessToken: string) {
  // TODO: Implement token validation logic
  // throw new Error();
  // }

  //   async exchangeCodeForTokens(code: string, provider: string) {
  //     // TODO: Implement OAuth code exchange logic
  //     throw new Error();
  //   }

  //private generateNewTokens(userId: string, userRole: string) {
  // TODO: Implement token generation logic
  //  throw new Error();
  //}
}
