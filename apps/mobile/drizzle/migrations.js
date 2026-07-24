// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_messy_next_avengers.sql';
import m0001 from './0001_green_rocket_racer.sql';
import m0002 from './0002_powerful_eddie_brock.sql';
import m0003 from './0003_lush_jackal.sql';
import m0004 from './0004_icy_silver_surfer.sql';
import m0005 from './0005_chief_gambit.sql';
import m0006 from './0006_majestic_amazoness.sql';
import m0007 from './0007_rich_mongoose.sql';
import m0008 from './0008_productive_zodiak.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
    m0005,
    m0006,
    m0007,
    m0008,
  },
};
