import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule,

    MongooseModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>(
          'MONGODB_URI',
        );

        if (!uri) {
          throw new Error(
            'MONGODB_URI is not defined',
          );
        }

        return {
          uri,
        };
      },
    }),
  ],
})
export class DatabaseModule {}