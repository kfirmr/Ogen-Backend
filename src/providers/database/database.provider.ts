import { Provider } from '@nestjs/common';
import { ProviderNames } from './provider-names';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { EnvironmentManager } from '../../utilities/environment-manager.utility';

export const DatabaseProvider: Provider = {
  provide: ProviderNames.SEQUELIZE,
  useFactory: () => {
    const dbName = EnvironmentManager.get('DB_NAME', { errorOnMissing: true });
    const dbUser = EnvironmentManager.get('DB_USER', { errorOnMissing: true });
    const dbPassword = EnvironmentManager.get('DB_PASS', {
      errorOnMissing: true,
    });
    const dbHost = EnvironmentManager.get('DB_HOST', { errorOnMissing: true });
    const useSSL = EnvironmentManager.get('DB_SSL') === 'true';

    const config: SequelizeOptions = {
      host: dbHost,
      database: dbName,
      username: dbUser,
      password: dbPassword,
      dialect: 'postgres',
      logging: EnvironmentManager.get('DB_LOGGING') === 'true',
      timezone: 'UTC',
      define: { underscored: true, timestamps: true },
      pool: {
        min: 0,
        idle: 10000,
        acquire: 60000,
        max: Number(
          EnvironmentManager.get('MAX_CONNECTIONS', { defaultValue: '10' }),
        ),
      },
      ...(useSSL && {
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized:
              EnvironmentManager.get('DB_SSL_REJECT_UNAUTHORIZED') !== 'false',
          },
        },
      }),
    };

    const sequelize = new Sequelize(config);

    sequelize.addModels([]);

    sequelize
      .sync()
      .then(() => {
        console.log('Connection to database has been established successfully');
      })
      .catch((error) => {
        console.error('Unable to connect to the database:', error);
      });

    return sequelize;
  },
};
