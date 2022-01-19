const columnsMap = (columns, type = 'new') => {
  return columns.reduce((acc, column) => {
    acc[column]
      = `{{$body.event.data.${type}.${column}}}`
    return acc
  }, {})
}

const genRequestTransform = (columns) => {
  const obj = {
    event        : {
      op           : '{{$body.event.op}}',
      trace_context: '{{$body.event.trace_context}}',
    },
    created_at   : '{{$body.created_at}}',
    id           : '{{$body.id}}',
    delivery_info: '{{$body.delivery_info}}',
    trigger      : '{{$body.trigger}}',
    table        : '{{$body.table}}',
  }
  if (columns?.length) {
    obj.event.data
      = {
      old: columnsMap(columns, 'old'),
      new: columnsMap(columns, 'new'),
    }
  } else {
    obj.event.data
      = '{{$body.event.data}}'
  }
  const str = JSON.stringify(obj)
  return str.replace(/['|"]\{\{/g, '{{')
            .replace(/\}\}['|"]/g, '}}')
}

const genArgs = (name, tableName, columns, insert, update, del) => {
  const args = {
    name,
    table            : {
      name  : tableName,
      schema: 'auth',
    },
    webhook          : process.env.HOOK_BASE_URL + '/events',
    headers          : [{
      'name' : 'x-auth-service-secret',
      'value': process.env.TRIGGER_SECRET,
    }],
    request_transform: {
      template_engine: 'Kriti',
      content_type   : 'application/json',
      body           : genRequestTransform(columns),
    },
  }
  if (insert) {
    args.insert
      = columns?.length ? {columns} : {columns: '*'}
  }
  if (update) {
    args.update
      = columns?.length ? {columns} : {columns: '*'}
  }
  if (del) {
    args.delete
      = {columns: '*'}
  }
  return args
}

exports.sync_user_profile
  = genArgs('sync_user_profile',
            'user',
            ['locale',
             'avatar_url',
             'bio',
             'nickname',
             'email'],
            false,
            true,
            true)

exports.sync_user_role
  = genArgs('sync_user_role',
            'user_role',
            ['user_id',
             'role'],
            false,
            true,
            false)

