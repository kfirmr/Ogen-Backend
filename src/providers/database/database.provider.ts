import { Provider } from '@nestjs/common';
import { ProviderNames } from './provider-names';
import { User } from '@Modules/user/entities/user.entity';
import { Level } from '@Modules/level/entities/level.entity';
import { Vendor } from '@Modules/vendor/entities/vendor.entity';
import { Insight } from '@Modules/insight/entities/insight.entity';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { XpEvent } from '@Modules/xp-event/entities/xp-event.entity';
import { XpAction } from '@Modules/xp-action/entities/xp-action.entity';
import { Transaction } from '@Modules/transaction/entities/transaction.entity';
import { EnvironmentManager } from '../../utilities/environment-manager.utility';
import { VendorAlias } from '@Modules/vendor-alias/entities/vendor-alias.entity';
import { Subscription } from '@Modules/subscription/entities/subscription.entity';
import { StatementImport } from '@Modules/statement-import/entities/statement-import.entity';

export const DatabaseProvider: Provider = {
  provide: ProviderNames.SEQUELIZE,
  useFactory: () => {
    const dbName = EnvironmentManager.get('DB_NAME', { errorOnMissing: true });
    const dbUser = EnvironmentManager.get('DB_USER', { errorOnMissing: true });
    const dbPassword = EnvironmentManager.get('DB_PASS', {
      errorOnMissing: true,
    });
    const dbHost = EnvironmentManager.get('DB_HOST', { errorOnMissing: true });
    const dbPort = EnvironmentManager.get('DB_PORT', { defaultValue: '5432' });
    const useSSL = EnvironmentManager.get('DB_SSL') === 'true';

    const config: SequelizeOptions = {
      host: dbHost,
      port: Number(dbPort),
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

    sequelize.addModels([
      User,
      Level,
      Insight,
      Vendor,
      XpAction,
      XpEvent,
      VendorAlias,
      Transaction,
      Subscription,
      StatementImport,
    ]);

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
