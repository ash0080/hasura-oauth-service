const fs = require('fs')
const path = require('path')

const runSQL = (runner, ...sqls) => {
  if (sqls.length === 1) {
    return runner.sql({sql: sqls[0]})
                 .run()
  } else {
    return runner.bulk(sqls.map(sql => runner.sql({sql})
                                             .toJson()))
                 .run()
  }
}

const getAuthVersion = (runner) => {
  return runSQL(runner, `SELECT auth.version()`)
}

const prepareDatabase = (runner) => {
  const migration = fs.readFileSync(path.join(__dirname, '../config/prepare.sql'), 'utf8')
  return runSQL(runner, migration)
}

const cleanEvents = (runner) => {
  return runSQL(runner,
                `SELECT auth.clean_events('sync_user_profile', '${process.env.CLEAN_THIS_SERVICE_EVENTS_BEFORE}')`,
                `SELECT auth.clean_events('sync_user_role', '${process.env.CLEAN_THIS_SERVICE_EVENTS_BEFORE}')`,
                `SELECT auth.clean_events(NULL, '${process.env.CLEAN_ALL_EVENTS_BEFORE}')`,
  )
}

module.exports = {
  getAuthVersion,
  prepareDatabase,
  cleanEvents,
}
