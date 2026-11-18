import * as migration_20261118_144100_make_the_cms_tables from './20261118_144100_make_the_cms_tables';

export const migrations = [
  {
    up: migration_20261118_144100_make_the_cms_tables.up,
    down: migration_20261118_144100_make_the_cms_tables.down,
    name: '20261118_144100_make_the_cms_tables'
  },
];
