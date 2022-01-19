const trackTables = async (meta, ...tables) => {
  try {
    const args = tables.map(table => meta.table.track({
                                                        table: {
                                                          name  : table,
                                                          schema: 'auth',
                                                        },
                                                      })
                                         .toJson())
    return await meta.bulk(args)
                     .run()
  } catch (err) {
    if (err.response.code !== 'already-tracked') {
      throw err
    }
  }
}

const regexParser = (str) => str.match(/^(a|o)\s*:([^:\s]*):\s*([^\s|\->]*)(\s*->\s*)?(.*)$/)
const relationParser = (meta, str) => {
  const [_, type = '', name = '', from = '', __ = '', to = ''] = regexParser(str)
  const [fromTable = '', fromColumn = ''] = from?.split('.') || []
  const [toTable = '', toColumn = ''] = to?.split('.') || []
  const table = {
    name  : fromTable,
    schema: 'auth',
  }
  const foreign_key_constraint_on = fromColumn ? fromColumn : {
    table : {
      name  : toTable,
      schema: 'auth',
    },
    column: toColumn,
  }

  const args = {
    name,
    table,
    using: {foreign_key_constraint_on},
  }
  if (type === 'a') {
    return meta.table
               .relationship
               .addArrayRL(args)
               .toJson()
  } else if (type === 'o') {
    return meta.table
               .relationship
               .addObjectRL(args)
               .toJson()
  }
}
//relationships.forEach(rel => {
//  const [_, type = '', name = '', from = '', __ = '', to = ''] = regexParser(rel)
//  console.log(type, name, from, to)
//})

const trackForeignKeys = async (meta, ...relations) => {
  try {
    const args = relations.map(rel => relationParser(meta, rel))
    return await meta.bulk(args).run()
  } catch (err) {
    if (err.response.code !== 'already-exists') {
      throw err
    }
  }
}

const trackFunctions = async (meta, ...functions) => {
  try {
    const args = functions.map(func => meta.schemaFunction
                                           .track({
                                                    function     : {
                                                      name  : func,
                                                      schema: 'auth',
                                                    },
                                                    configuration: {
                                                      exposed_as: 'mutation',
                                                    },
                                                  })
                                           .toJson())
    return await meta.bulk(args).run()
  } catch (err) {
    if (err.response.code !== 'already-tracked') {
      throw err
    }
  }
}

const setAsEnum = async (meta, ...enumTables) => {
  try {
    const args = enumTables.map(table => meta.table
                                             .setAsEnum({
                                                          table  : {
                                                            name  : table,
                                                            schema: 'auth',
                                                          },
                                                          is_enum: true,
                                                        })
                                             .toJson())
    return await meta.bulk(args).run()
  } catch (err) {
  }
}

const genJson = require('../config/permissions')
const setPermissions = async (meta) => {
  try {
    const p = meta.table.permission
    const args = [
      genJson(p, 'select', 'user', 'user'),
      genJson(p, 'delete', 'user', 'user'),
      genJson(p, 'update', 'user', 'user', ['avatar_url', 'bio', 'disabled', 'email', 'locale', 'nickname']),
      genJson(p, 'select', 'user', 'user_role', '*', 'user_id'),
      genJson(p, 'select', 'subscriber', 'user'),
      genJson(p, 'delete', 'subscriber', 'user'),
      genJson(p, 'update', 'subscriber', 'user', ['avatar_url', 'bio', 'disabled', 'email', 'locale', 'nickname']),
      genJson(p, 'select', 'subscriber', 'user_role', '*', 'user_id'),
    ]
    return await meta.bulk(args).run()
  } catch (err) {
    if (err.response.code !== 'already-exists') {
      throw err
    }
  }
}

const tables = ['provider',
                'role',
                'user',
                'user_provider',
                'user_role']
const enumTables = ['provider',
                    'role']
const functions = ['downgrade_expired_subscriber',
                   'upgrade_to_subscriber']
const relations = ['o:user:user_provider.user_id', //obj X
                   'o:providerByProvider:user_provider.provider', //obj X
                   'a:user_providers:provider->user_provider.provider', //array X

                   'o:roleByRole:user_role.role', //obj X
                   'o:user:user_role.user_id', //obj X
                   'a:user_roles:role->user_role.role', // array X

                   'o:user_role:user->user_role.user_id',//obj X
                   'a:user_providers:user->user_provider.user_id'] //array X

const {
  sync_user_profile,
  sync_user_role,
} = require('../config/triggers')

const events = [sync_user_profile,
                sync_user_role]

const addEvents = async (meta, ...events) => {
  try {
    const args = events.map(event => meta.trigger.event.add(event)
                                         .toJson())
    return await meta.bulk(args)
                     .run()
  } catch (err) {
    throw err
  }
}

const prepareMetadata = module.exports
  = async (app) => {
  try {
    app.log.info('preparing metadata........')
    await trackTables(app.hasura.metadata, ...tables)
    app.log.info('tracktables 👌')
    await setAsEnum(app.hasura.metadata, ...enumTables)
    app.log.info('set enum tables 👌')
    await trackForeignKeys(app.hasura.metadata, ...relations)
    app.log.info('track foreign keys 👌')
    await trackFunctions(app.hasura.metadata, ...functions)
    app.log.info('track functions 👌')
    await addEvents(app.hasura.metadata, ...events)
    app.log.info('add events 👌')
    await setPermissions(app.hasura.metadata)
    app.log.info('set permissions 👌')
    app.log.info('done......................')
  } catch (err) {
    app.log.info('failed....................')
    app.log.error(err)
  }
}

prepareMetadata.trackTables = trackTables
prepareMetadata.trackForeignKeys = trackForeignKeys
prepareMetadata.setAsEnum = setAsEnum
prepareMetadata.trackFunctions = trackFunctions
prepareMetadata.addEvents = addEvents
prepareMetadata.setPermissions = setPermissions
prepareMetadata.events = events
prepareMetadata.relations = relations
prepareMetadata.tables = tables
prepareMetadata.enumTables = enumTables
prepareMetadata.functions = functions
prepareMetadata.relationParser = relationParser
