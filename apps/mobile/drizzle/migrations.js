// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_messy_next_avengers.sql';
import m0001 from './0001_green_rocket_racer.sql';
import m0002 from './0002_powerful_eddie_brock.sql';
import m0003 from './0003_lush_jackal.sql';
import m0004 from './0004_icy_silver_surfer.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};
