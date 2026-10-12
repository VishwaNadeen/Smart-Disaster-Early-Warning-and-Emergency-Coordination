
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';

// Mock bcrypt before importing the service.
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn().mockResolvedValue(true),
}));

import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRole } from '../users/schemas/user.schema';
import {
  UnauthorizedException,
} from '@nestjs/common';

describe('AuthService - register', () => {
  let service: AuthService;

  let userModel: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    userModel = {
      findOne: vi.fn(),
      create: vi.fn(),
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('test-jwt-token'),
    };

    service = new AuthService(
      userModel as any,
      jwtService as any,
    );
  });

  it('should register a citizen successfully', async () => {
    vi.mocked(bcrypt.hash).mockImplementation(
    async () => 'hashed-password',
    );

    userModel.findOne.mockResolvedValue(null);

    userModel.create.mockResolvedValue({
      id: 'user-123',
      fullName: 'Test Citizen',
      email: 'citizen@example.com',
      passwordHash: 'hashed-password',
      phone: '0771234567',
      district: 'Colombo',
      address: 'Test address',
      role: UserRole.CITIZEN,
      isActive: true,
      createdAt: new Date(),
    });

    const result = await service.register({
      fullName: ' Test Citizen ',
      email: ' CITIZEN@example.com ',
      password: 'Password123!',
      phone: '0771234567',
      district: 'Colombo',
      address: 'Test address',
    } as any);

    // Email is normalized before searching.
    expect(userModel.findOne).toHaveBeenCalledWith({
      email: 'citizen@example.com',
    });

    // Password is hashed with 12 salt rounds.
    expect(bcrypt.hash).toHaveBeenCalledWith(
      'Password123!',
      12,
    );

    // A new citizen is created with normalized data.
    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Test Citizen',
        email: 'citizen@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.CITIZEN,
        isActive: true,
      }),
    );

    // A JWT is generated for the new user.
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-123',
      role: UserRole.CITIZEN,
    });

    // The expected response is returned.
    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'Citizen account created successfully',
    );
    expect(result.data.token).toBe('test-jwt-token');
    expect(result.data.user.email).toBe(
      'citizen@example.com',
    );

    // Password hash must not be exposed publicly.
    expect(result.data.user).not.toHaveProperty(
      'passwordHash',
    );
  });

  it('should reject registration when email already exists', async () => {
    userModel.findOne.mockResolvedValue({
      id: 'existing-user',
      email: 'citizen@example.com',
    });

    await expect(
      service.register({
        fullName: 'Test Citizen',
        email: 'citizen@example.com',
        password: 'Password123!',
        phone: '0771234567',
        district: 'Colombo',
        address: 'Test address',
      } as any),
    ).rejects.toThrow(
      new ConflictException('Email is already registered'),
    );

    // No account or token should be created.
    expect(userModel.create).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  
describe('AuthService - login', () => {
  const mockUser = {
    id: 'user-123',
    fullName: 'Test Citizen',
    email: 'citizen@example.com',
    passwordHash: 'hashed-password',
    phone: '0771234567',
    district: 'Colombo',
    address: 'Test address',
    role: UserRole.CITIZEN,
    isActive: true,
    createdAt: new Date(),
  };

  it('should login successfully with valid credentials', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    userModel.findOne.mockResolvedValue(mockUser);

    const result = await service.login({
      email: ' CITIZEN@example.com ',
      password: 'Password123!',
    } as any);

    expect(userModel.findOne).toHaveBeenCalledWith({
      email: 'citizen@example.com',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'Password123!',
      'hashed-password',
    );

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-123',
      role: UserRole.CITIZEN,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Login successful');
    expect(result.data.token).toBe('test-jwt-token');
    expect(result.data.user.email).toBe('citizen@example.com');
    expect(result.data.user).not.toHaveProperty('passwordHash');
  });

  it('should reject login when the email does not exist', async () => {
    userModel.findOne.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'unknown@example.com',
        password: 'Password123!',
      } as any),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid email or password'),
    );

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('should reject login when the password is incorrect', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    userModel.findOne.mockResolvedValue(mockUser);

    await expect(
      service.login({
        email: 'citizen@example.com',
        password: 'WrongPassword!',
      } as any),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid email or password'),
    );

    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('should reject login when the account is inactive', async () => {
    userModel.findOne.mockResolvedValue({
      ...mockUser,
      isActive: false,
    });

    await expect(
      service.login({
        email: 'citizen@example.com',
        password: 'Password123!',
      } as any),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid email or password'),
    );

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});

  
});
