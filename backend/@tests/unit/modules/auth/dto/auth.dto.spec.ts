import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { RegisterDto } from '@/modules/auth/dto/register.dto';

describe('Auth DTOs', () => {
  describe('LoginDto', () => {
    const validInput = { email: 'user@example.com', password: 'anypassword' };

    it('passes validation with valid email and password', async () => {
      const dto = plainToInstance(LoginDto, validInput);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation for invalid email format', async () => {
      const dto = plainToInstance(LoginDto, { ...validInput, email: 'not-an-email' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('fails validation for missing email', async () => {
      const dto = plainToInstance(LoginDto, { password: 'password123' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('fails validation for missing password', async () => {
      const dto = plainToInstance(LoginDto, { email: 'user@example.com' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'password')).toBe(true);
    });

    it('fails validation when password is a number (not string)', async () => {
      const dto = plainToInstance(LoginDto, { ...validInput, password: 12345678 });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'password')).toBe(true);
    });

    it('accepts email with subdomain', async () => {
      const dto = plainToInstance(LoginDto, { ...validInput, email: 'user@mail.example.co.uk' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects empty string email', async () => {
      const dto = plainToInstance(LoginDto, { ...validInput, email: '' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });
  });

  describe('RegisterDto', () => {
    const validInput = {
      email: 'newuser@example.com',
      password: 'securePassword123',
      name: 'John Doe',
    };

    it('passes validation with minimal required fields', async () => {
      const dto = plainToInstance(RegisterDto, validInput);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('passes validation with all optional fields', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validInput,
        company: 'Acme Corp',
        invitationToken: 'invite-token-abc',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation for invalid email format', async () => {
      const dto = plainToInstance(RegisterDto, { ...validInput, email: 'bad@' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('fails validation for password shorter than 8 characters', async () => {
      const dto = plainToInstance(RegisterDto, { ...validInput, password: 'short' });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'password')).toBe(true);
    });

    it('passes validation for password exactly 8 characters', async () => {
      const dto = plainToInstance(RegisterDto, { ...validInput, password: 'exactly8' });
      const errors = await validate(dto);
      expect(errors.filter(e => e.property === 'password')).toHaveLength(0);
    });

    it('fails validation for missing name', async () => {
      const dto = plainToInstance(RegisterDto, { email: validInput.email, password: validInput.password });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('fails validation when name is not a string', async () => {
      const dto = plainToInstance(RegisterDto, { ...validInput, name: 42 });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('allows optional company to be absent', async () => {
      const dto = plainToInstance(RegisterDto, validInput);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('fails validation when company is not a string', async () => {
      const dto = plainToInstance(RegisterDto, { ...validInput, company: 123 });
      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'company')).toBe(true);
    });

    it('allows optional invitationToken to be absent', async () => {
      const dto = plainToInstance(RegisterDto, { ...validInput });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
