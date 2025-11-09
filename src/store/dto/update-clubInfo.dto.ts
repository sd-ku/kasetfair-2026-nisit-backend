import { IsOptional, IsString, IsEmail, Length } from 'class-validator';

export class UpdateClubInfoRequestDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  clubName?: string;

  @IsOptional()
  @IsString()
  clubApplicationMediaId?: string; // ถ้าใช้จริง, ถ้าไม่ใช้ก็ลบทิ้ง

  @IsOptional()
  @IsString()
  leaderNisitId?: string; // ถ้าจะเลิกใช้ mapping กับ Nisit จริง ก็ลบทิ้งไปเลย

  @IsOptional()
  @IsString()
  @Length(1, 100)
  leaderFirstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  leaderLastName?: string;

  @IsOptional()
  @IsEmail()
  leaderEmail?: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  leaderPhone?: string;
}
