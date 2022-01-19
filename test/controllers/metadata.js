const tap = require('tap')
const app = require('../../src')
const {
  trackTables,
  setAsEnum,
  trackForeignKeys,
  trackFunctions,
  relationParser,
  addEvents,
  setPermissions,
  events,
  tables,
  enumTables,
  relations, functions,
} = require('../../src/controllers/metadata')

tap.before(async () => {
  await app.ready()
})

tap.teardown(async () => {
  try {
    await app.close()
  } catch (err) {
  }
})

tap.test('prepare metadata', async (t) => {
  //t.test('track tables', async t => {
  //  try {
  //    await trackTables(app.hasura.metadata, ...tables)
  //    t.pass('tables tracked')
  //  } catch (err) {
  //    t.fail(err)
  //  }
  //})
  //
  //t.test('enum tables', async t => {
  //  try {
  //    const resp = await setAsEnum(app.hasura.metadata, ...enumTables)
  //    app.log.info(resp)
  //    t.pass('tables set as enum')
  //  } catch (err) {
  //    t.fail(err)
  //  }
  //})
  //
  //t.test('relationParser', async t => {
  //  try {
  //    const args = relations.map(rel => relationParser(app.hasura.metadata, rel))
  //    app.log.info(args)
  //  } catch (err) {
  //    app.log.error(err)
  //    t.fail(err)
  //  }
  //})
  //
  //t.test('prepare foreign keys', async t => {
  //  try {
  //    const resp = await trackForeignKeys(app.hasura.metadata, ...relations)
  //    app.log.info(resp)
  //    t.pass('foreign keys tracked')
  //  } catch (err) {
  //    t.fail(err)
  //  }
  //})
  //t.test('prepare functions', async t => {
  //  try {
  //    const resp = await trackFunctions(app.hasura.metadata, ...functions)
  //    app.log.info(resp)
  //    t.pass('functions tracked')
  //  } catch (err) {
  //    t.fail(err)
  //  }
  //})
  //t.test('prepare event triggers', async t=> {
  //  try {
  //    const resp = await addEvents(app.hasura.metadata, ...events)
  //    app.log.info(resp)
  //    t.pass('functions tracked')
  //  } catch (err) {
  //    t.fail(err)
  //  }
  //})
  t.test('add permissions', async t => {
    try {
      const resp = await setPermissions(app.hasura.metadata)
      console.dir(resp)
      t.pass('permissions added')
    } catch (err) {
      console.error(err)
      t.fail(err)
    }
  })
})
