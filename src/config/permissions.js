const genPermissionArgs = ({role, tableName, userIdColumn = 'id', columns = '*', condition}) => {
  return {
    table     : {
      name  : tableName,
      schema: 'auth',
    },
    role,
    permission: {
      columns,
      filter: condition ? condition : {[userIdColumn]: {'_eq': 'X-Hasura-User-Id'}},
    },
  }
}

const genJson = (permission, crud, role, tableName, columns, userIdColumn, condition) => permission[crud]
  .add(genPermissionArgs({
                           role,
                           tableName,
                           userIdColumn,
                           columns,
                           condition,
                         }))
  .toJson()

module.exports = genJson
